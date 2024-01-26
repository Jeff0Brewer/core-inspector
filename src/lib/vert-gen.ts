import { TileTextureMetadata, TileRect } from '../lib/tile-texture'
import { BoundRect } from '../lib/util'
import { CoreShape, CoreViewMode } from '../vis/core'

const POS_FPV = 2
const TEX_FPV = 2
const LEN_FPV = 1

const TILE_WIDTH = 0.025

const MIN_RADIUS = TILE_WIDTH * 5
const MAX_RADIUS = 1
const RADIUS_RANGE = MAX_RADIUS - MIN_RADIUS

const ROW_PER_TILE = 12
const VERT_PER_ROW_TRI = 6
const VERT_PER_TILE_TRI = ROW_PER_TILE * VERT_PER_ROW_TRI

const VERT_PER_ROW_POINT = 3

const LINE_WIDTH = 0.0015
const VERT_PER_TILE_LINE = 2 * (4 + (ROW_PER_TILE + 1) + 2) + 1

/*
 * FULL CORE
 * - entry point for vertex generation
 * - passes metadata values into representation
 *   specific texture coordinate generators
 * - calculates and passes large scale layout variables
 *   for spiral / column shapes into representation specific
 *   position generators
 */

// interpolates texture coordinates from metadata for downscaled and punchcard representations
const getCoreTexCoords = (metadata: TileTextureMetadata): {
    downTexCoords: Float32Array,
    punchTexCoords: Float32Array
} => {
    const downCoords = new Float32Array(metadata.numTiles * VERT_PER_TILE_TRI * TEX_FPV)
    const punchCoords = new Float32Array(metadata.punchTotalRows * VERT_PER_ROW_POINT * TEX_FPV)
    let downOffset = 0
    let punchOffset = 0

    for (let i = 0; i < metadata.numTiles; i++) {
        downOffset = addDownscaledTexCoords(
            downCoords,
            downOffset,
            metadata.downTiles[i]
        )
        punchOffset = addPunchcardTexCoords(
            punchCoords,
            punchOffset,
            metadata.punchTiles[i],
            metadata.punchNumRows[i]
        )
    }

    return {
        downTexCoords: new Float32Array(downCoords),
        punchTexCoords: new Float32Array(punchCoords)
    }
}

// gets positions for all full core visualization elements.
// simplifies alignment since all elements calculate their position
// from layout variables determined in this single place
const getCorePositions = (
    metadata: TileTextureMetadata,
    spacing: [number, number],
    viewportBounds: BoundRect,
    shape: CoreShape,
    viewMode: CoreViewMode
): {
    downPositions: Float32Array,
    punchPositions: Float32Array,
    accentPositions: Float32Array,
    vertexBounds: BoundRect
} => {
    const downPositions = new Float32Array(metadata.numTiles * VERT_PER_TILE_TRI * POS_FPV)
    const punchPositions = new Float32Array(metadata.punchTotalRows * VERT_PER_ROW_POINT * POS_FPV)
    const accentPositions = new Float32Array(metadata.numTiles * VERT_PER_TILE_LINE * POS_FPV)
    let downOffset = 0
    let punchOffset = 0
    let accentOffset = 0

    // get variables needed for positioning inside loop
    const horizontalSpacing = spacing[0] * TILE_WIDTH
    const verticalSpacing = spacing[1] * TILE_WIDTH
    const numRotation = RADIUS_RANGE / (TILE_WIDTH + horizontalSpacing)
    const avgAngleSpacing = verticalSpacing / (MIN_RADIUS + RADIUS_RANGE * 0.5)
    const maxAngle = numRotation * Math.PI * 2 - avgAngleSpacing * metadata.numTiles

    // init variables for current position in spiral / column layout
    let radius = MIN_RADIUS
    let angle = 0
    let columnX = viewportBounds.left
    let columnY = viewportBounds.top

    for (let i = 0; i < metadata.numTiles; i++) {
        // calculate tile layout using downscaled tile dimensions as source of truth
        // for all vis elements, ensuring alignment
        const { height, width } = metadata.downTiles[i]
        // TODO: investigate tile dims in metadata, shouldn't have to scale tile height by 2
        const tileHeight = 2 * TILE_WIDTH * (height / width)
        const tileAngle = tileHeight / radius
        const tileRadius = tileAngle / maxAngle * RADIUS_RANGE

        // check if current tile in column bounds, wrap to next column if not
        if (columnY - tileHeight <= viewportBounds.bottom) {
            columnX += TILE_WIDTH + horizontalSpacing
            columnY = viewportBounds.top
        }

        // use previously calculated layout variables as arguments to
        // representation specific vertex generation
        if (shape === 'spiral') {
            downOffset = addDownscaledSpiralPositions(
                downPositions,
                downOffset,
                radius,
                angle,
                tileRadius,
                tileAngle,
                TILE_WIDTH
            )

            accentOffset = addAccentLineSpiralPositions(
                accentPositions,
                accentOffset,
                radius,
                angle,
                tileRadius,
                tileAngle,
                TILE_WIDTH
            )

            if (viewMode === 'punchcard') {
                punchOffset = addPunchcardSpiralPositions(
                    punchPositions,
                    punchOffset,
                    radius,
                    angle,
                    tileRadius,
                    tileAngle,
                    TILE_WIDTH,
                    metadata.punchNumRows[i]
                )
            }
        } else {
            downOffset = addDownscaledColumnPositions(
                downPositions,
                downOffset,
                columnX,
                columnY,
                tileHeight,
                TILE_WIDTH
            )

            accentOffset = addAccentLineColumnPositions(
                accentPositions,
                accentOffset,
                columnX,
                columnY,
                tileHeight,
                TILE_WIDTH
            )

            if (viewMode === 'punchcard') {
                punchOffset = addPunchcardColumnPositions(
                    punchPositions,
                    punchOffset,
                    columnX,
                    columnY,
                    tileHeight,
                    TILE_WIDTH,
                    metadata.punchNumRows[i]
                )
            }
        }

        // increment to next tile in layout
        columnY -= tileHeight + verticalSpacing
        angle += tileAngle + (verticalSpacing / radius)
        radius += tileRadius
    }

    // get bounds of new layout for scroll bar min / max
    const vertexBounds = shape === 'spiral'
        ? {
            left: -radius,
            right: radius,
            top: -radius,
            bottom: radius
        }
        : {
            left: viewportBounds.left,
            right: columnX,
            top: viewportBounds.top,
            bottom: viewportBounds.bottom
        }

    return {
        downPositions,
        punchPositions,
        accentPositions,
        vertexBounds
    }
}

/*
 * DOWNSCALED CORE
 * - takes parameters from full core generators and interpolates into downscaled representation
 * - layed out as individual triangles, two per row, 6 vertices per row total
 * - number of rows determined by ROW_PER_TILE constant, same for all tiles
 */

// helper to lay out attributes as triangles for downscaled representation.
// takes closure to get inner / outer values for a single row of tile
// and places values into buffer in correct order for triangles
const addDownscaledAttrib = (
    out: Float32Array,
    offset: number,
    getRowAttrib: (i: number, inner: Float32Array, outer: Float32Array) => void,
    floatsPerVertex: number
): number => {
    // use static references to get intermediate values from closure
    // to prevent excessive object creation / gc
    const inner = new Float32Array(floatsPerVertex)
    const outer = new Float32Array(floatsPerVertex)
    const nextInner = new Float32Array(floatsPerVertex)
    const nextOuter = new Float32Array(floatsPerVertex)

    // lays out attributes for two triangles per row
    for (let i = 0; i < ROW_PER_TILE; i++) {
        // only need 4 unique values per row, but 6 vertices
        // so store values in intermediate buffers and copy
        // into main buffer in correct order
        getRowAttrib(i, inner, outer)
        getRowAttrib(i + 1, nextInner, nextOuter)

        out.set(inner, offset)
        out.set(outer, offset + floatsPerVertex)
        out.set(nextOuter, offset + floatsPerVertex * 2)

        out.set(nextOuter, offset + floatsPerVertex * 3)
        out.set(nextInner, offset + floatsPerVertex * 4)
        out.set(inner, offset + floatsPerVertex * 5)

        offset += floatsPerVertex * 6
    }

    return offset
}

// get texture coordinates from rect defined in metadata
// and interpolate for vertices in single downscaled tile
const addDownscaledTexCoords = (
    out: Float32Array,
    offset: number,
    rect: TileRect
): number => {
    const yInc = rect.height / ROW_PER_TILE

    const getRowCoords = (
        i: number,
        inner: Float32Array,
        outer: Float32Array
    ): void => {
        const y = rect.top + yInc * i

        inner[0] = rect.left
        inner[1] = y

        outer[0] = rect.left + rect.width
        outer[1] = y
    }

    return addDownscaledAttrib(out, offset, getRowCoords, TEX_FPV)
}

// get spiral positions for single downscaled tile
// from tile width and tile radius / angle bounds
const addDownscaledSpiralPositions = (
    out: Float32Array,
    offset: number,
    currRadius: number,
    currAngle: number,
    tileRadius: number,
    tileAngle: number,
    tileWidth: number
): number => {
    const angleInc = tileAngle / ROW_PER_TILE
    const radiusInc = tileRadius / ROW_PER_TILE

    const getRowSpiralPositions = (
        i: number,
        inner: Float32Array,
        outer: Float32Array
    ): void => {
        const angle = currAngle + angleInc * i
        const radius = currRadius + radiusInc * i

        const cos = Math.cos(angle)
        const sin = Math.sin(angle)
        const innerRadius = radius + tileWidth * 0.5
        const outerRadius = radius - tileWidth * 0.5

        inner[0] = cos * innerRadius
        inner[1] = sin * innerRadius

        outer[0] = cos * outerRadius
        outer[1] = sin * outerRadius
    }

    return addDownscaledAttrib(out, offset, getRowSpiralPositions, POS_FPV)
}

// get column positions for a single downscaled tile
// from tile position x / y bounds
const addDownscaledColumnPositions = (
    out: Float32Array,
    offset: number,
    currColumnX: number,
    currColumnY: number,
    tileHeight: number,
    tileWidth: number
): number => {
    const columnYInc = tileHeight / ROW_PER_TILE

    const getRowColumnPositions = (
        i: number,
        inner: Float32Array,
        outer: Float32Array
    ): void => {
        const columnY = currColumnY - columnYInc * i

        inner[0] = currColumnX
        inner[1] = columnY

        outer[0] = currColumnX + tileWidth
        outer[1] = columnY
    }

    return addDownscaledAttrib(out, offset, getRowColumnPositions, POS_FPV)
}

/*
 * PUNCHCARD CORE
 * - takes parameters from full core generators and interpolates into punchcard representation
 * - layed out as individual points, each with a texture coordinate representing
 *   a unique pixel in punchcard mineral map texture
 * - requires number of rows value from metadata, a value representing the exact pixel height
 *   of the punchcard tile's mineral texture, to determine number of points per tile
 */

// get texture coordinates from rect defined in metadata
// and interpolate for each row of points in punchcard tile
const addPunchcardTexCoords = (
    out: Float32Array,
    offset: number,
    rect: TileRect,
    numRows: number
): number => {
    const yInc = rect.height / numRows
    const xInc = rect.width / VERT_PER_ROW_POINT

    // offset x and y by 0.5 to center coordinate on pixel in texture
    const x = rect.left + xInc * 0.5
    const startY = rect.top + yInc * 0.5

    for (let i = 0; i < numRows; i++) {
        const y = startY + yInc * i

        out[offset++] = x
        out[offset++] = y

        out[offset++] = x + xInc
        out[offset++] = y

        out[offset++] = x + 2 * xInc
        out[offset++] = y
    }

    return offset
}

// get spiral positions for single punchcard tile from tile width,
// tile radius / angle bounds, and number of rows from metadata
const addPunchcardSpiralPositions = (
    out: Float32Array,
    offset: number,
    currRadius: number,
    currAngle: number,
    tileRadius: number,
    tileAngle: number,
    tileWidth: number,
    numRows: number
): number => {
    const angleInc = tileAngle / numRows
    const radiusInc = tileRadius / numRows
    const acrossInc = tileWidth / VERT_PER_ROW_POINT

    // offset by 0.5 spacing to center points in tile bounds
    const startAngle = currAngle + angleInc * 0.5
    // move to edge of tile but again offset inwards to center in tile bounds
    const startRadius = currRadius + tileWidth * 0.5 - acrossInc * 0.5

    for (let i = 0; i < numRows; i++) {
        const radius = startRadius + radiusInc * i
        const angle = startAngle + angleInc * i
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)

        out[offset++] = cos * radius
        out[offset++] = sin * radius

        out[offset++] = cos * (radius - acrossInc)
        out[offset++] = sin * (radius - acrossInc)

        out[offset++] = cos * (radius - 2 * acrossInc)
        out[offset++] = sin * (radius - 2 * acrossInc)
    }

    return offset
}

// get column positions for a single punchcard tile
// from tile position x / y bounds and number of rows
const addPunchcardColumnPositions = (
    out: Float32Array,
    offset: number,
    currColumnX: number,
    currColumnY: number,
    tileHeight: number,
    tileWidth: number,
    numRows: number
): number => {
    const columnYInc = -1 * tileHeight / numRows
    const columnXInc = tileWidth / VERT_PER_ROW_POINT

    // offset by 0.5 spacing to center points in tile bounds
    const columnX = currColumnX + columnXInc * 0.5
    const startColumnY = currColumnY + columnYInc * 0.5

    for (let i = 0; i < numRows; i++) {
        const columnY = startColumnY + columnYInc * i

        out[offset++] = columnX
        out[offset++] = columnY

        out[offset++] = columnX + columnXInc
        out[offset++] = columnY

        out[offset++] = columnX + 2 * columnXInc
        out[offset++] = columnY
    }

    return offset
}

/*
 * ACCENT LINES
 */

const addEmptyAttrib = (out: Float32Array, ind: number, floatPerVertex: number): number => {
    if (ind < floatPerVertex) {
        return ind + floatPerVertex * 2
    }
    for (let i = 0; i < floatPerVertex * 2; i++, ind++) {
        out[ind] = out[ind - floatPerVertex]
    }
    return ind
}

const getLineLengths = (numVertex: number, metadata: TileTextureMetadata): Float32Array => {
    const SIDE_DASH_DENSITY = 150.0

    let bufInd = 0
    const out = new Float32Array(numVertex * LEN_FPV)

    for (const { height } of metadata.downTiles) {
        const heightInc = height / ROW_PER_TILE * SIDE_DASH_DENSITY

        bufInd = addEmptyAttrib(out, bufInd, LEN_FPV)

        out[bufInd++] = 2

        // use representative height for side lines
        for (let i = 0; i <= ROW_PER_TILE; i++) {
            out[bufInd++] = 2 + heightInc * i
            out[bufInd++] = 2 + heightInc * i
        }

        bufInd = addEmptyAttrib(out, bufInd, LEN_FPV)

        // use constant length for bottom lines
        out[bufInd++] = 0
        out[bufInd++] = 0

        bufInd = addEmptyAttrib(out, bufInd, LEN_FPV)

        out[bufInd++] = 1
        out[bufInd++] = 1

        bufInd = addEmptyAttrib(out, bufInd, LEN_FPV)
    }

    return out
}

const addAccentLineSpiralPositions = (
    out: Float32Array,
    offset: number,
    currRadius: number,
    currAngle: number,
    tileRadius: number,
    tileAngle: number,
    tileWidth: number
): number => {
    const angleInc = tileAngle / ROW_PER_TILE
    const radiusInc = tileRadius / ROW_PER_TILE

    offset = addEmptyAttrib(out, offset, POS_FPV)

    let angle = currAngle
    let radius = currRadius + tileWidth * 0.5

    out[offset++] = Math.cos(angle) * radius
    out[offset++] = Math.sin(angle) * radius

    for (let i = 0; i <= ROW_PER_TILE; i++) {
        const angle = currAngle + angleInc * i
        const radius = currRadius + radiusInc * i + tileWidth * 0.5
        out[offset++] = Math.cos(angle) * radius
        out[offset++] = Math.sin(angle) * radius
        out[offset++] = Math.cos(angle) * (radius + LINE_WIDTH)
        out[offset++] = Math.sin(angle) * (radius + LINE_WIDTH)
    }

    offset = addEmptyAttrib(out, offset, POS_FPV)

    angle = currAngle + tileAngle
    radius = currRadius + tileRadius
    const tangentX = -Math.sin(angle)
    const tangentY = Math.cos(angle)

    out[offset++] = Math.cos(angle) * (radius + tileWidth * 0.5)
    out[offset++] = Math.sin(angle) * (radius + tileWidth * 0.5)

    offset = addEmptyAttrib(out, offset, POS_FPV)

    out[offset++] = Math.cos(angle) * (radius + tileWidth * 0.5) + tangentX * LINE_WIDTH
    out[offset++] = Math.sin(angle) * (radius + tileWidth * 0.5) + tangentY * LINE_WIDTH

    out[offset++] = Math.cos(angle) * (radius - tileWidth * 0.5)
    out[offset++] = Math.sin(angle) * (radius - tileWidth * 0.5)
    out[offset++] = Math.cos(angle) * (radius - tileWidth * 0.5) + tangentX * LINE_WIDTH
    out[offset++] = Math.sin(angle) * (radius - tileWidth * 0.5) + tangentY * LINE_WIDTH

    offset = addEmptyAttrib(out, offset, POS_FPV)

    return offset
}

const addAccentLineColumnPositions = (
    out: Float32Array,
    offset: number,
    currColumnX: number,
    currColumnY: number,
    tileHeight: number,
    tileWidth: number
): number => {
    const columnYInc = tileHeight / ROW_PER_TILE

    offset = addEmptyAttrib(out, offset, POS_FPV)

    out[offset++] = currColumnX
    out[offset++] = currColumnY

    for (let i = 0; i <= ROW_PER_TILE; i++) {
        out[offset++] = currColumnX
        out[offset++] = currColumnY - columnYInc * i
        out[offset++] = currColumnX - LINE_WIDTH
        out[offset++] = currColumnY - columnYInc * i
    }

    offset = addEmptyAttrib(out, offset, POS_FPV)

    out[offset++] = currColumnX
    out[offset++] = currColumnY - tileHeight

    offset = addEmptyAttrib(out, offset, POS_FPV)

    out[offset++] = currColumnX
    out[offset++] = currColumnY - tileHeight - LINE_WIDTH

    out[offset++] = currColumnX + tileWidth
    out[offset++] = currColumnY - tileHeight
    out[offset++] = currColumnX + tileWidth
    out[offset++] = currColumnY - tileHeight - LINE_WIDTH

    offset = addEmptyAttrib(out, offset, POS_FPV)

    return offset
}

export {
    getCorePositions,
    getCoreTexCoords,
    getLineLengths,
    POS_FPV,
    TEX_FPV,
    LEN_FPV
}

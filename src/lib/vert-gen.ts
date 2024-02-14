import { BoundRect } from '../lib/util'
import { TileTextureMetadata, TileRect } from '../lib/tile-texture'
import { CoreShape, CoreViewMode } from '../vis/core'

// number of floats per vertex for position / tex coord attributes
const POS_FPV = 2
const TEX_FPV = 2

// sizing / layout parameters
const TILE_WIDTH = 0.025
const LINE_WIDTH = 0.002
const MIN_RADIUS = TILE_WIDTH * 5
const MAX_RADIUS = 1
const RADIUS_RANGE = MAX_RADIUS - MIN_RADIUS

// detail of triangle / line representations
const ROW_PER_TILE = 12

// vertex count definitions, number of vertices
// generated in different functions below
const VERT_PER_ROW_TRI = 6
const VERT_PER_TILE_TRI = ROW_PER_TILE * VERT_PER_ROW_TRI
const VERT_PER_TILE_LINE = 2 * 2 + 2 + 4 + (ROW_PER_TILE * 2)

const CALIBRATION_HEIGHT = 0.01

function getNumRows (
    part: TileRect,
    pointPerRow: number,
    calibrationT: number
): number {
    const height = 2 * part.height - CALIBRATION_HEIGHT * calibrationT
    return Math.round(pointPerRow * height / part.width)
}

function getTotalNumRows (
    parts: Array<TileRect>,
    pointPerRow: number,
    calibrationT: number
): number {
    let numRows = 0
    for (let i = 0; i < parts.length; i++) {
        numRows += getNumRows(parts[i], pointPerRow, calibrationT)
    }
    return numRows
}

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
function getCoreTexCoords (
    metadata: TileTextureMetadata,
    pointPerRow: number,
    calibrationT: number
): {
    downTexCoords: Float32Array,
    punchTexCoords: Float32Array
} {
    const numRows = getTotalNumRows(metadata.tiles, pointPerRow, calibrationT)
    const punchTexCoords = new Float32Array(numRows * pointPerRow * TEX_FPV)
    const downTexCoords = new Float32Array(metadata.tiles.length * VERT_PER_TILE_TRI * TEX_FPV)
    let punchOffset = 0
    let downOffset = 0

    for (let i = 0; i < metadata.tiles.length; i++) {
        punchOffset = addPunchcardTexCoords(
            punchTexCoords,
            punchOffset,
            pointPerRow,
            metadata.tiles[i],
            calibrationT
        )
        downOffset = addDownscaledTexCoords(
            downTexCoords,
            downOffset,
            metadata.tiles[i],
            calibrationT
        )
    }

    return { downTexCoords, punchTexCoords }
}

// gets positions for all full core visualization elements.
// simplifies alignment since all elements calculate their position
// from layout variables determined in this single place
function getCorePositions (
    metadata: TileTextureMetadata,
    pointPerRow: number,
    spacing: [number, number],
    viewportBounds: BoundRect,
    shape: CoreShape,
    viewMode: CoreViewMode,
    calibrationT: number
): {
    downPositions: Float32Array,
    punchPositions: Float32Array,
    accentPositions: Float32Array,
    vertexBounds: BoundRect
} {
    const numRows = getTotalNumRows(metadata.tiles, pointPerRow, calibrationT)
    const punchPositions = new Float32Array(numRows * pointPerRow * POS_FPV)
    const downPositions = new Float32Array(metadata.tiles.length * VERT_PER_TILE_TRI * POS_FPV)
    const accentPositions = new Float32Array(metadata.tiles.length * VERT_PER_TILE_LINE * POS_FPV)
    let punchOffset = 0
    let downOffset = 0
    let accentOffset = 0

    // get variables needed for positioning inside loop
    const horizontalSpacing = spacing[0] * TILE_WIDTH
    const verticalSpacing = spacing[1] * TILE_WIDTH
    const numRotation = RADIUS_RANGE / (TILE_WIDTH + horizontalSpacing)
    const avgAngleSpacing = verticalSpacing / (MIN_RADIUS + RADIUS_RANGE * 0.5)
    const maxAngle = numRotation * Math.PI * 2 - avgAngleSpacing * metadata.tiles.length

    // init variables for current position in spiral / column layout
    let radius = MIN_RADIUS
    let angle = 0
    let columnX = viewportBounds.left
    let columnY = viewportBounds.top

    for (let i = 0; i < metadata.tiles.length; i++) {
        let { height, width } = metadata.tiles[i]
        height -= CALIBRATION_HEIGHT * calibrationT
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
                tileAngle
            )

            accentOffset = addAccentLineSpiralPositions(
                accentPositions,
                accentOffset,
                radius,
                angle,
                tileRadius,
                tileAngle
            )

            if (viewMode === 'punchcard') {
                punchOffset = addPunchcardSpiralPositions(
                    punchPositions,
                    punchOffset,
                    pointPerRow,
                    radius,
                    angle,
                    tileRadius,
                    tileAngle,
                    getNumRows(metadata.tiles[i], pointPerRow, calibrationT)
                )
            }
        } else {
            downOffset = addDownscaledColumnPositions(
                downPositions,
                downOffset,
                columnX,
                columnY,
                tileHeight
            )

            accentOffset = addAccentLineColumnPositions(
                accentPositions,
                accentOffset,
                columnX,
                columnY,
                tileHeight
            )

            if (viewMode === 'punchcard') {
                punchOffset = addPunchcardColumnPositions(
                    punchPositions,
                    punchOffset,
                    pointPerRow,
                    columnX,
                    columnY,
                    tileHeight,
                    getNumRows(metadata.tiles[i], pointPerRow, calibrationT),
                    calibrationT
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
function addDownscaledAttrib (
    out: Float32Array,
    offset: number,
    getRowAttrib: (i: number, inner: Float32Array, outer: Float32Array) => void,
    floatsPerVertex: number
): number {
    // use static references to get intermediate values from closure
    // to prevent excessive object creation / gc
    const inner = new Float32Array(floatsPerVertex)
    const outer = new Float32Array(floatsPerVertex)
    const nextInner = new Float32Array(floatsPerVertex)
    const nextOuter = new Float32Array(floatsPerVertex)

    // lays out attributes for two triangles per row
    for (let i = 0; i < ROW_PER_TILE; i++) {
        // only need 4 unique values per row, but 6 vertices,
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
function addDownscaledTexCoords (
    out: Float32Array,
    offset: number,
    rect: TileRect,
    calibrationT: number
): number {
    const yStart = rect.top + CALIBRATION_HEIGHT * calibrationT
    const yInc = (rect.height - CALIBRATION_HEIGHT * calibrationT) / ROW_PER_TILE

    const getRowCoords = (
        i: number,
        inner: Float32Array,
        outer: Float32Array
    ): void => {
        const y = yStart + yInc * i

        inner[0] = rect.left
        inner[1] = y

        outer[0] = rect.left + rect.width
        outer[1] = y
    }

    return addDownscaledAttrib(out, offset, getRowCoords, TEX_FPV)
}

// get spiral positions for single downscaled tile
// from tile width and tile radius / angle bounds
function addDownscaledSpiralPositions (
    out: Float32Array,
    offset: number,
    currRadius: number,
    currAngle: number,
    tileRadius: number,
    tileAngle: number
): number {
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
        const innerRadius = radius + TILE_WIDTH * 0.5
        const outerRadius = radius - TILE_WIDTH * 0.5

        inner[0] = cos * innerRadius
        inner[1] = sin * innerRadius

        outer[0] = cos * outerRadius
        outer[1] = sin * outerRadius
    }

    return addDownscaledAttrib(out, offset, getRowSpiralPositions, POS_FPV)
}

// get column positions for a single downscaled tile
// from tile position x / y bounds
function addDownscaledColumnPositions (
    out: Float32Array,
    offset: number,
    currColumnX: number,
    currColumnY: number,
    tileHeight: number
): number {
    const columnYInc = tileHeight / ROW_PER_TILE

    const getRowColumnPositions = (
        i: number,
        inner: Float32Array,
        outer: Float32Array
    ): void => {
        const columnY = currColumnY - columnYInc * i

        inner[0] = currColumnX
        inner[1] = columnY

        outer[0] = currColumnX + TILE_WIDTH
        outer[1] = columnY
    }

    return addDownscaledAttrib(out, offset, getRowColumnPositions, POS_FPV)
}

/*
 * PUNCHCARD CORE
 * - takes parameters from full core generators and interpolates into punchcard representation
 * - layed out as individual points, with colors from average of downscaled texture
 */

// get texture coordinates from rect defined in metadata
// and interpolate for each row of points in punchcard tile
function addPunchcardTexCoords (
    out: Float32Array,
    offset: number,
    pointPerRow: number,
    rect: TileRect,
    calibrationT: number
): number {
    const numRows = getNumRows(rect, pointPerRow, calibrationT)
    const xInc = rect.width / pointPerRow
    const yInc = (rect.height - CALIBRATION_HEIGHT * calibrationT) / numRows

    // offset x and y by 0.5 to center coordinate on pixel in texture
    const x = rect.left + xInc * 0.5
    const startY = (rect.top + CALIBRATION_HEIGHT * calibrationT) + yInc * 0.5

    for (let i = 0; i < numRows; i++) {
        const y = startY + yInc * i

        for (let j = 0; j < pointPerRow; j++) {
            out[offset++] = x + xInc * j
            out[offset++] = y
        }
    }

    return offset
}

// get spiral positions for single punchcard tile from tile width,
// tile radius / angle bounds, and number of rows from metadata
function addPunchcardSpiralPositions (
    out: Float32Array,
    offset: number,
    pointPerRow: number,
    currRadius: number,
    currAngle: number,
    tileRadius: number,
    tileAngle: number,
    numRows: number
): number {
    const angleInc = tileAngle / numRows
    const radiusInc = tileRadius / numRows
    const acrossInc = TILE_WIDTH / pointPerRow

    // offset by 0.5 spacing to center points in tile bounds
    const startAngle = currAngle + angleInc * 0.5
    // move to edge of tile but again offset inwards to center in tile bounds
    const startRadius = currRadius + TILE_WIDTH * 0.5 - acrossInc * 0.5

    for (let i = 0; i < numRows; i++) {
        const radius = startRadius + radiusInc * i
        const angle = startAngle + angleInc * i
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)

        for (let j = 0; j < pointPerRow; j++) {
            out[offset++] = cos * (radius - acrossInc * j)
            out[offset++] = sin * (radius - acrossInc * j)
        }
    }

    return offset
}

// get column positions for a single punchcard tile
// from tile position x / y bounds and number of rows
function addPunchcardColumnPositions (
    out: Float32Array,
    offset: number,
    pointPerRow: number,
    currColumnX: number,
    currColumnY: number,
    tileHeight: number,
    numRows: number,
    calibrationT: number
): number {
    numRows -= Math.round(CALIBRATION_HEIGHT * calibrationT)

    const columnYInc = tileHeight / numRows
    const columnXInc = TILE_WIDTH / pointPerRow

    // offset by 0.5 spacing to center points in tile bounds
    const columnX = currColumnX + columnXInc * 0.5
    const startColumnY = currColumnY - columnYInc * 0.5

    for (let i = 0; i < numRows; i++) {
        const columnY = startColumnY - columnYInc * i

        for (let j = 0; j < pointPerRow; j++) {
            out[offset++] = columnX + columnXInc * j
            out[offset++] = columnY
        }
    }

    return offset
}

/*
 * ACCENT LINES
 * - takes parameters from full core generators and calculates line geometry
 * - uses same level of detail as downscaled representation to align properly
 * - renders as single triangle strip, so requires duplicating vertices at the start
 *   and end of every line segment to set line width to 0 and hide when between segments
 */

// copies first vertex in line segment to hide continuation from last segment
function startLine (out: Float32Array, offset: number, values: Float32Array): number {
    out.set(values, offset)
    out.set(values, offset + values.length)
    return offset + 2 * values.length
}

// copies last vertex in line segment to hide continuation to next segment
function endLine (out: Float32Array, offset: number, floatPerVertex: number): number {
    for (let i = 0; i < floatPerVertex; i++, offset++) {
        out[offset] = out[offset - floatPerVertex]
    }
    return offset
}

// generates lines along side and bottom of spiral tile given
// layout params from full core generator
function addAccentLineSpiralPositions (
    out: Float32Array,
    offset: number,
    currRadius: number,
    currAngle: number,
    tileRadius: number,
    tileAngle: number
): number {
    const angleInc = tileAngle / ROW_PER_TILE
    const radiusInc = tileRadius / ROW_PER_TILE

    let angle = currAngle
    let radius = currRadius + TILE_WIDTH * 0.5

    // add vertices for line along side of tile.
    // set first position here to duplicate first vertex and
    // hide any continuation from prior segment in triangle strip
    offset = startLine(out, offset, new Float32Array([
        Math.cos(angle) * radius,
        Math.sin(angle) * radius
    ]))
    out[offset++] = Math.cos(angle) * (radius + LINE_WIDTH)
    out[offset++] = Math.sin(angle) * (radius + LINE_WIDTH)

    // add remaining vertices along side of tile
    for (let i = 1; i <= ROW_PER_TILE; i++) {
        const angle = currAngle + angleInc * i
        const radius = currRadius + radiusInc * i + TILE_WIDTH * 0.5

        const cos = Math.cos(angle)
        const sin = Math.sin(angle)

        out[offset++] = cos * radius
        out[offset++] = sin * radius

        out[offset++] = cos * (radius + LINE_WIDTH)
        out[offset++] = sin * (radius + LINE_WIDTH)
    }

    offset = endLine(out, offset, POS_FPV)

    angle = currAngle + tileAngle
    radius = currRadius + tileRadius
    const tangentX = -Math.sin(angle) * LINE_WIDTH
    const tangentY = Math.cos(angle) * LINE_WIDTH
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    const innerRadius = radius + TILE_WIDTH * 0.5
    const outerRadius = radius - TILE_WIDTH * 0.5

    // add vertices for line along bottom of tile
    offset = startLine(out, offset, new Float32Array([
        cos * innerRadius,
        sin * innerRadius
    ]))
    out[offset++] = cos * innerRadius + tangentX
    out[offset++] = sin * innerRadius + tangentY

    out[offset++] = cos * outerRadius
    out[offset++] = sin * outerRadius

    out[offset++] = cos * outerRadius + tangentX
    out[offset++] = sin * outerRadius + tangentY

    offset = endLine(out, offset, POS_FPV)

    return offset
}

// generates lines along side and bottom of column tile given
// layout params from full core generator
function addAccentLineColumnPositions (
    out: Float32Array,
    offset: number,
    currColumnX: number,
    currColumnY: number,
    tileHeight: number
): number {
    const columnYInc = tileHeight / ROW_PER_TILE

    // add vertices for line along side of tile.
    // set first position here to duplicate first vertex and
    // hide any prior segment in triangle strip
    offset = startLine(out, offset, new Float32Array([
        currColumnX,
        currColumnY
    ]))
    out[offset++] = currColumnX - LINE_WIDTH
    out[offset++] = currColumnY

    // add remaining vertices for along side of tile
    for (let i = 1; i <= ROW_PER_TILE; i++) {
        out[offset++] = currColumnX
        out[offset++] = currColumnY - columnYInc * i
        out[offset++] = currColumnX - LINE_WIDTH
        out[offset++] = currColumnY - columnYInc * i
    }

    offset = endLine(out, offset, POS_FPV)

    // add vertices for line along bottom of tile
    offset = startLine(out, offset, new Float32Array([
        currColumnX,
        currColumnY - tileHeight
    ]))
    out[offset++] = currColumnX
    out[offset++] = currColumnY - tileHeight - LINE_WIDTH

    out[offset++] = currColumnX + TILE_WIDTH
    out[offset++] = currColumnY - tileHeight
    out[offset++] = currColumnX + TILE_WIDTH
    out[offset++] = currColumnY - tileHeight - LINE_WIDTH

    offset = endLine(out, offset, POS_FPV)

    return offset
}

// rectangle with texture coordinates to fill full viewport.
// used to render fragments in full viewport for blending
const FULLSCREEN_RECT = new Float32Array([
    -1, -1, 0, 0,
    1, -1, 1, 0,
    -1, 1, 0, 1,
    1, 1, 1, 1
])

export {
    getCorePositions,
    getCoreTexCoords,
    startLine,
    endLine,
    ROW_PER_TILE,
    POS_FPV,
    TEX_FPV,
    FULLSCREEN_RECT
}

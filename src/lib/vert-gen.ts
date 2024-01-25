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

const getCoreTexCoords = (metadata: TileTextureMetadata): {
    downTexCoords: Float32Array,
    punchTexCoords: Float32Array
} => {
    const downFloatPerTile = NUM_ROWS * VERT_PER_ROW * TEX_FPV
    const punchFloatPerTile = (numRows: number): number => numRows * POINT_PER_ROW * TEX_FPV

    const downCoords = new Float32Array(metadata.numTiles * downFloatPerTile)
    const punchCoords = new Float32Array(punchFloatPerTile(metadata.punchTotalRows))

    let downOffset = 0
    let punchOffset = 0

    for (let i = 0; i < metadata.numTiles; i++) {
        addDownscaledTexCoords(
            downCoords,
            downOffset,
            metadata.downTiles[i]
        )
        addPunchcardTexCoords(
            punchCoords,
            punchOffset,
            metadata.punchTiles[i],
            metadata.punchNumRows[i]
        )

        downOffset += downFloatPerTile
        punchOffset += punchFloatPerTile(metadata.punchNumRows[i])
    }

    return {
        downTexCoords: new Float32Array(downCoords),
        punchTexCoords: new Float32Array(punchCoords)
    }
}

// calculate positions for downsampled and punchcard
// representations in same place to simplify alignment
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
    const downFloatPerTile = NUM_ROWS * VERT_PER_ROW * POS_FPV
    const punchFloatPerTile = (numRows: number): number => numRows * POINT_PER_ROW * POS_FPV
    const accentFloatPerTile = VERT_PER_TILE_LINE * POS_FPV

    const downPositions = new Float32Array(metadata.numTiles * downFloatPerTile)
    const punchPositions = new Float32Array(punchFloatPerTile(metadata.punchTotalRows))
    const accentPositions = new Float32Array(metadata.numTiles * accentFloatPerTile)

    // get spacing from percentage of tile width
    const [horizontalSpacing, verticalSpacing] = spacing.map(s => s * TILE_WIDTH)

    const numRotation = RADIUS_RANGE / (TILE_WIDTH + horizontalSpacing)
    const avgAngleSpacing = verticalSpacing / (MIN_RADIUS + RADIUS_RANGE * 0.5)
    const maxAngle = numRotation * Math.PI * 2 - avgAngleSpacing * metadata.numTiles

    let radius = MIN_RADIUS
    let angle = 0
    let columnX = viewportBounds.left
    let columnY = viewportBounds.top

    let downOffset = 0
    let punchOffset = 0
    let accentOffset = 0

    for (let i = 0; i < metadata.numTiles; i++) {
        // use downscaled tile dimensions to determine layout for
        // both representations, ensuring alignment
        // TODO: investigate tile dims in metadata, shouldn't have to scale tile height by 2
        const { height, width } = metadata.downTiles[i]
        const tileHeight = 2 * TILE_WIDTH * (height / width)
        const tileAngle = tileHeight / radius
        const tileRadius = tileAngle / maxAngle * RADIUS_RANGE

        // check if tile within viewport bounds, wrap to next column if outside
        if (columnY - tileHeight <= viewportBounds.bottom) {
            columnX += TILE_WIDTH + horizontalSpacing
            columnY = viewportBounds.top
        }

        if (shape === 'spiral') {
            addDownscaledSpiralPositions(
                downPositions,
                downOffset,
                radius,
                angle,
                tileRadius,
                tileAngle,
                TILE_WIDTH
            )

            addAccentLineSpiralPositions(
                accentPositions,
                accentOffset,
                radius,
                angle,
                tileRadius,
                tileAngle,
                TILE_WIDTH
            )

            if (viewMode === 'punchcard') {
                addPunchcardSpiralPositions(
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
            addDownscaledColumnPositions(
                downPositions,
                downOffset,
                columnX,
                columnY,
                tileHeight,
                TILE_WIDTH
            )

            addAccentLineColumnPositions(
                accentPositions,
                accentOffset,
                columnX,
                columnY,
                tileHeight,
                TILE_WIDTH
            )

            if (viewMode === 'punchcard') {
                addPunchcardColumnPositions(
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

        columnY -= tileHeight + verticalSpacing
        angle += tileAngle + (verticalSpacing / radius)
        radius += tileRadius

        downOffset += downFloatPerTile
        punchOffset += punchFloatPerTile(metadata.punchNumRows[i])
        accentOffset += accentFloatPerTile
    }

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

const NUM_ROWS = 12
const VERT_PER_ROW = 6
const VERT_PER_TILE = NUM_ROWS * VERT_PER_ROW

const addDownscaledAttrib = (
    out: Float32Array,
    offset: number,
    getRowAttrib: (i: number) => [Array<number>, Array<number>],
    floatsPerVertex: number
): void => {
    let bufInd = 0
    const attribs = new Float32Array(VERT_PER_TILE * floatsPerVertex)

    for (let i = 0; i < NUM_ROWS; i++) {
        const [inner, outer] = getRowAttrib(i)
        const [nextInner, nextOuter] = getRowAttrib(i + 1)

        attribs.set(inner, bufInd)
        bufInd += floatsPerVertex

        attribs.set(outer, bufInd)
        bufInd += floatsPerVertex

        attribs.set(nextOuter, bufInd)
        bufInd += floatsPerVertex

        attribs.set(nextOuter, bufInd)
        bufInd += floatsPerVertex

        attribs.set(nextInner, bufInd)
        bufInd += floatsPerVertex

        attribs.set(inner, bufInd)
        bufInd += floatsPerVertex
    }
    out.set(attribs, offset)
}

const addDownscaledTexCoords = (
    out: Float32Array,
    offset: number,
    rect: TileRect
): void => {
    const heightInc = rect.height / NUM_ROWS
    const getRowCoords = (i: number): [Array<number>, Array<number>] => {
        const inner = [
            rect.left,
            rect.top + heightInc * i
        ]
        const outer = [
            rect.left + rect.width,
            rect.top + heightInc * i
        ]
        return [inner, outer]
    }
    addDownscaledAttrib(out, offset, getRowCoords, TEX_FPV)
}

const addDownscaledSpiralPositions = (
    out: Float32Array,
    offset: number,
    currRadius: number,
    currAngle: number,
    tileRadius: number,
    tileAngle: number,
    tileWidth: number
): void => {
    const angleInc = tileAngle / NUM_ROWS
    const radiusInc = tileRadius / NUM_ROWS

    const getRowSpiralPositions = (i: number): [Array<number>, Array<number>] => {
        const angle = currAngle + angleInc * i
        const radius = currRadius + radiusInc * i

        const inner = [
            Math.cos(angle) * (radius + tileWidth * 0.5),
            Math.sin(angle) * (radius + tileWidth * 0.5)
        ]

        const outer = [
            Math.cos(angle) * (radius - tileWidth * 0.5),
            Math.sin(angle) * (radius - tileWidth * 0.5)
        ]

        return [inner, outer]
    }

    addDownscaledAttrib(out, offset, getRowSpiralPositions, POS_FPV)
}

const addDownscaledColumnPositions = (
    out: Float32Array,
    offset: number,
    currColumnX: number,
    currColumnY: number,
    tileHeight: number,
    tileWidth: number
): void => {
    const columnYInc = tileHeight / NUM_ROWS

    const getRowColumnPositions = (i: number): [Array<number>, Array<number>] => {
        const columnY = currColumnY - columnYInc * i
        const columnX = currColumnX

        const inner = [columnX, columnY]
        const outer = [columnX + tileWidth, columnY]
        return [inner, outer]
    }

    addDownscaledAttrib(out, offset, getRowColumnPositions, POS_FPV)
}

const POINT_PER_ROW = 3

const addPunchcardAttrib = (
    out: Float32Array,
    offset: number,
    getRowAttrib: (i: number) => Float32Array,
    numRows: number,
    floatsPerVertex: number
): void => {
    const numVertex = POINT_PER_ROW * numRows

    let bufInd = 0
    const attribs = new Float32Array(numVertex * floatsPerVertex)
    for (let i = 0; i < numRows; i++) {
        const attrib = getRowAttrib(i)
        attribs.set(attrib, bufInd)
        bufInd += attrib.length
    }
    out.set(attribs, offset)
}

const addPunchcardTexCoords = (
    out: Float32Array,
    offset: number,
    rect: TileRect,
    numRows: number
): void => {
    const heightInc = rect.height / numRows
    const widthInc = rect.width / POINT_PER_ROW

    const buffer = new Float32Array(6)

    const getRowCoords = (i: number): Float32Array => {
        const yCoord = rect.top + heightInc * i

        buffer[0] = rect.left
        buffer[1] = yCoord
        buffer[2] = rect.left + widthInc
        buffer[3] = yCoord
        buffer[4] = rect.left + 2 * widthInc
        buffer[5] = yCoord
        return buffer
    }
    addPunchcardAttrib(out, offset, getRowCoords, numRows, TEX_FPV)
}

const addPunchcardSpiralPositions = (
    out: Float32Array,
    offset: number,
    currRadius: number,
    currAngle: number,
    tileRadius: number,
    tileAngle: number,
    tileWidth: number,
    numRows: number
): void => {
    const angleInc = tileAngle / numRows
    const radiusInc = tileRadius / numRows
    const acrossInc = tileWidth / POINT_PER_ROW

    const startRadius = currRadius + tileWidth * 0.5 - acrossInc * 0.5

    const buffer = new Float32Array(6)

    const getRowPositions = (i: number): Float32Array => {
        const radius = startRadius + radiusInc * i
        const angle = currAngle + angleInc * (i + 0.5)
        const sin = Math.sin(angle)
        const cos = Math.cos(angle)

        buffer[0] = cos * radius
        buffer[1] = sin * radius
        buffer[2] = cos * (radius - acrossInc)
        buffer[3] = sin * (radius - acrossInc)
        buffer[4] = cos * (radius - 2 * acrossInc)
        buffer[5] = sin * (radius - 2 * acrossInc)
        return buffer
    }

    addPunchcardAttrib(out, offset, getRowPositions, numRows, POS_FPV)
}

const addPunchcardColumnPositions = (
    out: Float32Array,
    offset: number,
    currColumnX: number,
    currColumnY: number,
    tileHeight: number,
    tileWidth: number,
    numRows: number
): void => {
    const columnYInc = -1 * tileHeight / numRows
    const columnXInc = tileWidth / POINT_PER_ROW

    const buffer = new Float32Array(6)

    const getRowPositions = (i: number): Float32Array => {
        const columnY = currColumnY + columnYInc * (i + 0.5)
        const columnX = currColumnX + columnXInc * 0.5

        buffer[0] = columnX
        buffer[1] = columnY
        buffer[2] = columnX + columnXInc
        buffer[3] = columnY
        buffer[4] = columnX + 2 * columnXInc
        buffer[5] = columnY
        return buffer
    }

    addPunchcardAttrib(out, offset, getRowPositions, numRows, POS_FPV)
}

const getLineLengths = (numVertex: number, metadata: TileTextureMetadata): Float32Array => {
    const SIDE_DASH_DENSITY = 150.0

    let bufInd = 0
    const lineLengths = new Float32Array(numVertex * LEN_FPV)

    for (const { height } of metadata.downTiles) {
        const heightInc = height / NUM_ROWS * SIDE_DASH_DENSITY

        bufInd = addEmptyAttrib(lineLengths, bufInd, LEN_FPV)

        lineLengths[bufInd++] = 2

        // use representative height for side lines
        for (let i = 0; i <= NUM_ROWS; i++) {
            lineLengths[bufInd++] = 2 + heightInc * i
            lineLengths[bufInd++] = 2 + heightInc * i
        }

        bufInd = addEmptyAttrib(lineLengths, bufInd, LEN_FPV)

        // use constant length for bottom lines
        lineLengths[bufInd++] = 0
        lineLengths[bufInd++] = 0

        bufInd = addEmptyAttrib(lineLengths, bufInd, LEN_FPV)

        lineLengths[bufInd++] = 1
        lineLengths[bufInd++] = 1

        bufInd = addEmptyAttrib(lineLengths, bufInd, LEN_FPV)
    }

    return lineLengths
}

const LINE_WIDTH = 0.0015
const VERT_PER_TILE_LINE = 2 * (4 + (NUM_ROWS + 1) + 2) + 1

const addEmptyAttrib = (out: Float32Array, ind: number, floatPerVertex: number): number => {
    if (ind < floatPerVertex) {
        return ind + floatPerVertex * 2
    }
    for (let i = 0; i < floatPerVertex * 2; i++, ind++) {
        out[ind] = out[ind - floatPerVertex]
    }
    return ind
}

const addAccentLineSpiralPositions = (
    out: Float32Array,
    offset: number,
    currRadius: number,
    currAngle: number,
    tileRadius: number,
    tileAngle: number,
    tileWidth: number
): void => {
    const angleInc = tileAngle / NUM_ROWS
    const radiusInc = tileRadius / NUM_ROWS

    offset = addEmptyAttrib(out, offset, POS_FPV)

    let angle = currAngle
    let radius = currRadius + tileWidth * 0.5

    out[offset++] = Math.cos(angle) * radius
    out[offset++] = Math.sin(angle) * radius

    for (let i = 0; i <= NUM_ROWS; i++) {
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
}

const addAccentLineColumnPositions = (
    out: Float32Array,
    offset: number,
    currColumnX: number,
    currColumnY: number,
    tileHeight: number,
    tileWidth: number
): void => {
    const columnYInc = tileHeight / NUM_ROWS

    offset = addEmptyAttrib(out, offset, POS_FPV)

    out[offset++] = currColumnX
    out[offset++] = currColumnY

    for (let i = 0; i <= NUM_ROWS; i++) {
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
}

export {
    getCorePositions,
    getCoreTexCoords,
    getLineLengths,
    POS_FPV,
    TEX_FPV,
    LEN_FPV
}

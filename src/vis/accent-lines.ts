import { mat4 } from 'gl-matrix'
import { GlContext, GlProgram, GlBuffer } from '../lib/gl-wrap'
import { TileTextureMetadata } from '../lib/tile-texture'
import { POS_FPV, CoreShape } from '../vis/core'
import { NUM_ROWS } from '../vis/downscaled-core'
import vertSource from '../shaders/accent-line-vert.glsl?raw'
import fragSource from '../shaders/accent-line-frag.glsl?raw'

const LEN_FPV = 1

class AccentLineRenderer {
    program: GlProgram
    spiralPosBuffer: GlBuffer
    columnPosBuffer: GlBuffer
    lineLengthBuffer: GlBuffer
    setProj: (m: mat4) => void
    setView: (m: mat4) => void
    setShapeT: (t: number) => void
    numVertex: number

    constructor (
        gl: GlContext,
        positions: Float32Array,
        shape: CoreShape,
        tileMetadata: TileTextureMetadata
    ) {
        this.numVertex = positions.length / POS_FPV

        this.program = new GlProgram(gl, vertSource, fragSource)

        const emptyBuffer = new Float32Array(positions.length)

        this.spiralPosBuffer = new GlBuffer(gl)
        this.spiralPosBuffer.setData(gl, shape === 'spiral' ? positions : emptyBuffer)
        this.spiralPosBuffer.addAttribute(gl, this.program, 'spiralPos', POS_FPV, POS_FPV, 0)

        this.columnPosBuffer = new GlBuffer(gl)
        this.columnPosBuffer.setData(gl, shape === 'column' ? positions : emptyBuffer)
        this.columnPosBuffer.addAttribute(gl, this.program, 'columnPos', POS_FPV, POS_FPV, 0)

        this.lineLengthBuffer = new GlBuffer(gl)
        this.lineLengthBuffer.setData(gl, getLineLengths(this.numVertex, tileMetadata))
        this.lineLengthBuffer.addAttribute(gl, this.program, 'lineLength', LEN_FPV, LEN_FPV, 0)

        const projLoc = this.program.getUniformLocation(gl, 'proj')
        const viewLoc = this.program.getUniformLocation(gl, 'view')
        const shapeTLoc = this.program.getUniformLocation(gl, 'shapeT')
        this.setProj = (m: mat4): void => { gl.uniformMatrix4fv(projLoc, false, m) }
        this.setView = (m: mat4): void => { gl.uniformMatrix4fv(viewLoc, false, m) }
        this.setShapeT = (t: number): void => { gl.uniform1f(shapeTLoc, t) }
    }

    setPositions (
        gl: GlContext,
        positions: Float32Array,
        shape: CoreShape
    ): void {
        if (shape === 'spiral') {
            this.spiralPosBuffer.setData(gl, positions)
        } else {
            this.columnPosBuffer.setData(gl, positions)
        }
    }

    draw (
        gl: GlContext,
        view: mat4,
        shapeT: number
    ): void {
        this.program.bind(gl)

        this.spiralPosBuffer.bind(gl)
        this.columnPosBuffer.bind(gl)
        this.lineLengthBuffer.bind(gl)
        this.setView(view)
        this.setShapeT(shapeT)

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.numVertex)
    }

    drop (gl: GlContext): void {
        this.program.drop(gl)
        this.spiralPosBuffer.drop(gl)
        this.columnPosBuffer.drop(gl)
        this.lineLengthBuffer.drop(gl)
    }
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
const VERT_PER_TILE = 2 * (4 + (NUM_ROWS + 1) + 2) + 1

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

export default AccentLineRenderer
export {
    addAccentLineSpiralPositions,
    addAccentLineColumnPositions,
    VERT_PER_TILE
}

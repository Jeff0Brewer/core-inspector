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

        gl.drawArrays(gl.LINES, 0, this.numVertex)
    }

    drop (gl: GlContext): void {
        this.program.drop(gl)
        this.spiralPosBuffer.drop(gl)
        this.columnPosBuffer.drop(gl)
        this.lineLengthBuffer.drop(gl)
    }
}

const getLineLengths = (numVertex: number, metadata: TileTextureMetadata): Float32Array => {
    const lineLengths = new Float32Array(numVertex * LEN_FPV)

    const SIDE_DASH_DENSITY = 150.0

    let bufferInd = 0
    for (const { height } of metadata.downTiles) {
        const heightInc = height / NUM_ROWS * SIDE_DASH_DENSITY

        // use representative height for side lines
        for (let i = 0; i < NUM_ROWS; i++) {
            lineLengths[bufferInd++] = 2 + heightInc * i
            lineLengths[bufferInd++] = 2 + heightInc * (i + 1)
        }

        // use constant length for bottom lines
        lineLengths[bufferInd++] = 0
        lineLengths[bufferInd++] = 1
    }

    return lineLengths
}

const VERT_PER_LINE = 2

const VERT_PER_TILE = VERT_PER_LINE + NUM_ROWS * VERT_PER_LINE

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

    let bufInd = 0
    const positions = new Float32Array(VERT_PER_TILE * POS_FPV)
    for (let i = 0; i < NUM_ROWS; i++) {
        let angle = currAngle + angleInc * i
        let radius = currRadius + radiusInc * i + tileWidth * 0.5
        positions[bufInd++] = Math.cos(angle) * radius
        positions[bufInd++] = Math.sin(angle) * radius

        angle += angleInc
        radius += radiusInc
        positions[bufInd++] = Math.cos(angle) * radius
        positions[bufInd++] = Math.sin(angle) * radius
    }

    const angle = currAngle + tileAngle
    const radius = currRadius + tileRadius
    positions[bufInd++] = Math.cos(angle) * (radius + tileWidth * 0.5)
    positions[bufInd++] = Math.sin(angle) * (radius + tileWidth * 0.5)
    positions[bufInd++] = Math.cos(angle) * (radius - tileWidth * 0.5)
    positions[bufInd++] = Math.sin(angle) * (radius - tileWidth * 0.5)

    out.set(positions, offset)
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

    let bufInd = 0
    const positions = new Float32Array(VERT_PER_TILE * POS_FPV)
    for (let i = 0; i < NUM_ROWS; i++) {
        positions[bufInd++] = currColumnX
        positions[bufInd++] = currColumnY - columnYInc * i
        positions[bufInd++] = currColumnX
        positions[bufInd++] = currColumnY - columnYInc * (i + 1)
    }

    positions[bufInd++] = currColumnX
    positions[bufInd++] = currColumnY - tileHeight
    positions[bufInd++] = currColumnX + tileWidth
    positions[bufInd++] = currColumnY - tileHeight

    out.set(positions, offset)
}

export default AccentLineRenderer
export {
    addAccentLineSpiralPositions,
    addAccentLineColumnPositions,
    VERT_PER_LINE
}

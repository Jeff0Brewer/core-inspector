import { mat4 } from 'gl-matrix'
import { GlContext, GlProgram, GlBuffer } from '../lib/gl-wrap'
import { TileTextureMetadata } from '../lib/tile-texture'
import { CoreShape } from '../vis/core'
import { POS_FPV, ROW_PER_TILE, startLine, endLine } from '../lib/vert-gen'
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
        this.lineLengthBuffer.setData(gl, getLineLengths(tileMetadata, this.numVertex))
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

const getLineLengths = (
    metadata: TileTextureMetadata,
    numVertex: number
): Float32Array => {
    const SIDE_DASH_DENSITY = 150.0

    let offset = 0
    const out = new Float32Array(numVertex * LEN_FPV)

    for (const { height } of metadata.downTiles) {
        const heightInc = height / ROW_PER_TILE * SIDE_DASH_DENSITY

        offset = startLine(out, offset, new Float32Array([2]))
        out[offset++] = 2

        // use representative height for side lines
        for (let i = 1; i <= ROW_PER_TILE; i++) {
            out[offset++] = 2 + heightInc * i
            out[offset++] = 2 + heightInc * i
        }

        offset = endLine(out, offset, LEN_FPV)

        offset = startLine(out, offset, new Float32Array([0]))
        out[offset++] = 0

        out[offset++] = 1
        out[offset++] = 1

        offset = endLine(out, offset, LEN_FPV)
    }

    return out
}

export default AccentLineRenderer

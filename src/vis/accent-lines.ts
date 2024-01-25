import { mat4 } from 'gl-matrix'
import { GlContext, GlProgram, GlBuffer } from '../lib/gl-wrap'
import { TileTextureMetadata } from '../lib/tile-texture'
import { CoreShape } from '../vis/core'
import { POS_FPV, LEN_FPV, getLineLengths } from '../lib/vert-gen'
import vertSource from '../shaders/accent-line-vert.glsl?raw'
import fragSource from '../shaders/accent-line-frag.glsl?raw'

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

export default AccentLineRenderer

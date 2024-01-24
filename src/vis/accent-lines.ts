import { mat4 } from 'gl-matrix'
import { GlContext, GlProgram, GlBuffer } from '../lib/gl-wrap'
import { POS_FPV, CoreShape } from '../vis/core'
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
        shape: CoreShape
    ) {
        this.program = new GlProgram(gl, vertSource, fragSource)

        this.numVertex = positions.length / POS_FPV
        this.spiralPosBuffer = new GlBuffer(gl)
        this.spiralPosBuffer.setData(
            gl,
            shape === 'spiral'
                ? positions
                : new Float32Array(positions.length)
        )
        this.spiralPosBuffer.addAttribute(gl, this.program, 'spiralPos', POS_FPV, POS_FPV, 0)

        this.columnPosBuffer = new GlBuffer(gl)
        this.columnPosBuffer.setData(
            gl,
            shape === 'column'
                ? positions
                : new Float32Array(positions.length)
        )
        this.columnPosBuffer.addAttribute(gl, this.program, 'columnPos', POS_FPV, POS_FPV, 0)

        this.lineLengthBuffer = new GlBuffer(gl)
        this.lineLengthBuffer.setData(gl, getLineLengths(this.numVertex))
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

const getLineLengths = (numVertex: number): Float32Array => {
    const lineLengths = new Float32Array(numVertex * LEN_FPV)
    for (let i = 0; i < lineLengths.length; i++) {
        lineLengths[i] = i % 2
    }
    return lineLengths
}

const VERT_PER_LINE = 2

const addAccentLineSpiralPositions = (
    out: Float32Array,
    offset: number,
    currRadius: number,
    currAngle: number,
    tileRadius: number,
    tileAngle: number,
    tileWidth: number
): void => {
    const angle = currAngle + tileAngle
    const radius = currRadius + tileRadius

    out.set([
        Math.cos(angle) * (radius + tileWidth * 0.5),
        Math.sin(angle) * (radius + tileWidth * 0.5),
        Math.cos(angle) * (radius - tileWidth * 0.5),
        Math.sin(angle) * (radius - tileWidth * 0.5)
    ], offset)
}

const addAccentLineColumnPositions = (
    out: Float32Array,
    offset: number,
    currColumnX: number,
    currColumnY: number,
    tileHeight: number,
    tileWidth: number
): void => {
    const columnX = currColumnX
    const columnY = currColumnY - tileHeight

    out.set([
        columnX,
        columnY,
        columnX + tileWidth,
        columnY
    ], offset)
}

export default AccentLineRenderer
export {
    addAccentLineSpiralPositions,
    addAccentLineColumnPositions,
    VERT_PER_LINE
}

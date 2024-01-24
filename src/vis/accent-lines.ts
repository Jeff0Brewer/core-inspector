import { mat4 } from 'gl-matrix'
import { initProgram, initBuffer, initAttribute } from '../lib/gl-wrap'
import { POS_FPV, CoreShape } from '../vis/core'
import vertSource from '../shaders/accent-line-vert.glsl?raw'
import fragSource from '../shaders/accent-line-frag.glsl?raw'

class AccentLineRenderer {
    program: WebGLProgram
    spiralPosBuffer: WebGLBuffer
    columnPosBuffer: WebGLBuffer
    bindSpiralPos: () => void
    bindColumnPos: () => void
    setProj: (m: mat4) => void
    setView: (m: mat4) => void
    setShapeT: (t: number) => void
    numVertex: number

    constructor (
        gl: WebGLRenderingContext,
        positions: Float32Array,
        shape: CoreShape
    ) {
        this.program = initProgram(gl, vertSource, fragSource)

        this.numVertex = positions.length / POS_FPV
        this.spiralPosBuffer = initBuffer(gl)
        gl.bufferData(
            gl.ARRAY_BUFFER,
            shape === 'spiral' ? positions : new Float32Array(positions.length),
            gl.STATIC_DRAW
        )

        this.columnPosBuffer = initBuffer(gl)
        gl.bufferData(
            gl.ARRAY_BUFFER,
            shape === 'column' ? positions : new Float32Array(positions.length),
            gl.STATIC_DRAW
        )

        this.bindSpiralPos = initAttribute(gl, this.program, 'spiralPos', POS_FPV, POS_FPV, 0)
        this.bindColumnPos = initAttribute(gl, this.program, 'columnPos', POS_FPV, POS_FPV, 0)

        const projLoc = gl.getUniformLocation(this.program, 'proj')
        const viewLoc = gl.getUniformLocation(this.program, 'view')
        const shapeTLoc = gl.getUniformLocation(this.program, 'shapeT')
        this.setProj = (m: mat4): void => { gl.uniformMatrix4fv(projLoc, false, m) }
        this.setView = (m: mat4): void => { gl.uniformMatrix4fv(viewLoc, false, m) }
        this.setShapeT = (t: number): void => { gl.uniform1f(shapeTLoc, t) }
    }

    setPositions (
        gl: WebGLRenderingContext,
        positions: Float32Array,
        shape: CoreShape
    ): void {
        gl.bindBuffer(gl.ARRAY_BUFFER, shape === 'spiral'
            ? this.spiralPosBuffer
            : this.columnPosBuffer
        )
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)
    }

    draw (
        gl: WebGLRenderingContext,
        view: mat4,
        shapeT: number
    ): void {
        gl.useProgram(this.program)

        gl.bindBuffer(gl.ARRAY_BUFFER, this.spiralPosBuffer)
        this.bindSpiralPos()

        gl.bindBuffer(gl.ARRAY_BUFFER, this.columnPosBuffer)
        this.bindColumnPos()

        this.setView(view)
        this.setShapeT(shapeT)

        gl.drawArrays(gl.LINES, 0, this.numVertex)
    }
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

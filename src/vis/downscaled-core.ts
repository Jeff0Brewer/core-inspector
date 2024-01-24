import { mat4 } from 'gl-matrix'
import { initProgram, initBuffer, initAttribute } from '../lib/gl-wrap'
import { POS_FPV, TEX_FPV, CoreShape } from '../vis/core'
import { TileRect } from '../lib/tile-texture'
import MineralBlender from '../vis/mineral-blend'
import vertSource from '../shaders/downscaled-vert.glsl?raw'
import fragSource from '../shaders/downscaled-frag.glsl?raw'

class DownscaledCoreRenderer {
    minerals: MineralBlender
    program: WebGLProgram
    spiralPosBuffer: WebGLBuffer
    columnPosBuffer: WebGLBuffer
    texCoordBuffer: WebGLBuffer
    bindSpiralPos: () => void
    bindColumnPos: () => void
    bindTexCoords: () => void
    setProj: (m: mat4) => void
    setView: (m: mat4) => void
    setShapeT: (t: number) => void
    numVertex: number

    constructor (
        gl: WebGLRenderingContext,
        minerals: MineralBlender,
        positions: Float32Array,
        texCoords: Float32Array,
        shape: CoreShape
    ) {
        this.minerals = minerals

        this.program = initProgram(gl, vertSource, fragSource)

        this.texCoordBuffer = initBuffer(gl)
        gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW)
        this.numVertex = texCoords.length / TEX_FPV

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
        this.bindTexCoords = initAttribute(gl, this.program, 'texCoord', TEX_FPV, TEX_FPV, 0)

        const projLoc = gl.getUniformLocation(this.program, 'proj')
        const viewLoc = gl.getUniformLocation(this.program, 'view')
        const shapeTLoc = gl.getUniformLocation(this.program, 'shapeT')
        this.setProj = (m: mat4): void => { gl.uniformMatrix4fv(projLoc, false, m) }
        this.setView = (m: mat4): void => { gl.uniformMatrix4fv(viewLoc, false, m) }
        this.setShapeT = (t: number): void => { gl.uniform1f(shapeTLoc, t) }
    }

    // generate vertices externally to coordinate alignment between
    // punchcard and downscaled representations
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

        this.minerals.bind(gl)
        gl.bindBuffer(gl.ARRAY_BUFFER, this.spiralPosBuffer)
        this.bindSpiralPos()
        gl.bindBuffer(gl.ARRAY_BUFFER, this.columnPosBuffer)
        this.bindColumnPos()
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer)
        this.bindTexCoords()

        this.setView(view)
        this.setShapeT(shapeT)

        gl.drawArrays(gl.TRIANGLES, 0, this.numVertex)
    }
}

const NUM_ROWS = 12
const VERT_PER_ROW = 6

const addDownscaledAttrib = (
    out: Float32Array,
    offset: number,
    getRowAttrib: (i: number) => [Array<number>, Array<number>]
): void => {
    const attribs = []
    for (let i = 0; i < NUM_ROWS; i++) {
        const [inner, outer] = getRowAttrib(i)
        const [nextInner, nextOuter] = getRowAttrib(i + 1)
        attribs.push(
            ...inner,
            ...outer,
            ...nextOuter,
            ...nextOuter,
            ...nextInner,
            ...inner
        )
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
    addDownscaledAttrib(out, offset, getRowCoords)
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

    addDownscaledAttrib(out, offset, getRowSpiralPositions)
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

    addDownscaledAttrib(out, offset, getRowColumnPositions)
}

export default DownscaledCoreRenderer
export {
    addDownscaledSpiralPositions,
    addDownscaledColumnPositions,
    addDownscaledTexCoords,
    NUM_ROWS,
    VERT_PER_ROW
}

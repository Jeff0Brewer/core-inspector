import { mat4 } from 'gl-matrix'
import { initProgram, initBuffer, initAttribute } from '../lib/gl-wrap'
import { ease } from '../lib/util'
import { POS_FPV, TEX_FPV, POS_STRIDE, TEX_STRIDE } from '../vis/core'
import { TileRect } from '../lib/tile-texture'
import MineralBlender from '../vis/mineral-blend'
import vertSource from '../shaders/downscaled-vert.glsl?raw'
import fragSource from '../shaders/downscaled-frag.glsl?raw'

class DownscaledCoreRenderer {
    minerals: MineralBlender
    program: WebGLProgram
    posBuffer: WebGLBuffer
    texBuffer: WebGLBuffer
    bindPositions: () => void
    bindTexCoords: () => void
    setProj: (m: mat4) => void
    setView: (m: mat4) => void
    setShapeT: (t: number) => void
    numVertex: number

    constructor (
        gl: WebGLRenderingContext,
        minerals: MineralBlender,
        positions: Float32Array,
        texCoords: Float32Array
    ) {
        this.minerals = minerals

        this.program = initProgram(gl, vertSource, fragSource)

        this.numVertex = positions.length / POS_STRIDE
        this.posBuffer = initBuffer(gl)
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)
        this.texBuffer = initBuffer(gl)
        gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW)

        const bindSpiralPos = initAttribute(gl, this.program, 'spiralPos', POS_FPV, POS_STRIDE, 0)
        const bindColumnPos = initAttribute(gl, this.program, 'columnPos', POS_FPV, POS_STRIDE, POS_FPV)
        this.bindPositions = (): void => {
            bindSpiralPos()
            bindColumnPos()
        }
        this.bindTexCoords = initAttribute(gl, this.program, 'texCoord', TEX_FPV, TEX_STRIDE, 0)

        const projLoc = gl.getUniformLocation(this.program, 'proj')
        const viewLoc = gl.getUniformLocation(this.program, 'view')
        const shapeTLoc = gl.getUniformLocation(this.program, 'shapeT')
        this.setProj = (m: mat4): void => { gl.uniformMatrix4fv(projLoc, false, m) }
        this.setView = (m: mat4): void => { gl.uniformMatrix4fv(viewLoc, false, m) }
        this.setShapeT = (t: number): void => { gl.uniform1f(shapeTLoc, t) }
    }

    // generate vertices externally to coordinate alignment between
    // punchcard and downscaled representations
    setPositions (gl: WebGLRenderingContext, positions: Float32Array): void {
        const newNumVertex = positions.length / POS_STRIDE
        if (newNumVertex !== this.numVertex) {
            throw new Error('Incorrect number of new position vertices')
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)
    }

    draw (gl: WebGLRenderingContext, mineralIndex: number, shapeT: number): void {
        gl.useProgram(this.program)

        gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer)
        this.bindPositions()
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texBuffer)
        this.bindTexCoords()

        this.setShapeT(ease(shapeT))
        this.minerals.bind(gl, mineralIndex)

        gl.drawArrays(gl.TRIANGLES, 0, this.numVertex)
    }
}

const TILE_DETAIL = 12

const addDownscaledAttrib = (
    out: Array<number>,
    getRowAttrib: (i: number) => [Array<number>, Array<number>]
): void => {
    for (let i = 0; i < TILE_DETAIL; i++) {
        const [inner, outer] = getRowAttrib(i)
        const [nextInner, nextOuter] = getRowAttrib(i + 1)
        out.push(
            ...inner,
            ...outer,
            ...nextOuter,
            ...nextOuter,
            ...nextInner,
            ...inner
        )
    }
}

const addDownscaledTexCoords = (
    out: Array<number>,
    rect: TileRect
): void => {
    const heightInc = rect.height / TILE_DETAIL
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
    addDownscaledAttrib(out, getRowCoords)
}

const addDownscaledPositions = (
    out: Array<number>,
    currRadius: number,
    currAngle: number,
    currColX: number,
    currColY: number,
    tileRadius: number,
    tileAngle: number,
    tileHeight: number,
    bandWidth: number
): void => {
    const angleInc = tileAngle / TILE_DETAIL
    const radiusInc = tileRadius / TILE_DETAIL
    const colYInc = tileHeight / TILE_DETAIL

    const getRowPositions = (i: number): [Array<number>, Array<number>] => {
        const angle = currAngle + angleInc * i
        const radius = currRadius + radiusInc * i
        const colY = currColY - colYInc * i
        const colX = currColX

        const inner = [
            Math.cos(angle) * (radius - bandWidth * 0.5),
            Math.sin(angle) * (radius - bandWidth * 0.5),
            colX,
            colY
        ]
        const outer = [
            Math.cos(angle) * (radius + bandWidth * 0.5),
            Math.sin(angle) * (radius + bandWidth * 0.5),
            colX + bandWidth,
            colY
        ]
        return [inner, outer]
    }

    addDownscaledAttrib(out, getRowPositions)
}

export default DownscaledCoreRenderer
export {
    addDownscaledPositions,
    addDownscaledTexCoords
}

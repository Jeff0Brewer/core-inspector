import { mat4 } from 'gl-matrix'
import { initProgram, initBuffer, initAttribute, initTextureFramebuffer } from '../lib/gl-wrap'
import { ease } from '../lib/util'
import { POS_FPV, POS_STRIDE } from '../vis/core'
import { TileTextureMetadata } from '../lib/tile-texture'
import vertSource from '../shaders/stencil-vert.glsl?raw'
import fragSource from '../shaders/stencil-frag.glsl?raw'

const COL_FPV = 2
const COL_STRIDE = COL_FPV

class StencilCoreRenderer {
    framebuffer: WebGLFramebuffer
    program: WebGLProgram
    posBuffer: WebGLBuffer
    colBuffer: WebGLBuffer
    bindPositions: () => void
    bindColors: () => void
    setProj: (m: mat4) => void
    setView: (m: mat4) => void
    setShapeT: (t: number) => void
    numVertex: number

    constructor (
        gl: WebGLRenderingContext,
        positions: Float32Array,
        metadata: TileTextureMetadata
    ) {
        const { framebuffer } = initTextureFramebuffer(gl, 1, 1) // placeholder dimensions
        this.framebuffer = framebuffer

        this.program = initProgram(gl, vertSource, fragSource)

        this.numVertex = positions.length / POS_STRIDE
        this.posBuffer = initBuffer(gl)
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)

        this.colBuffer = initBuffer(gl)
        const vertPerTile = this.numVertex / metadata.numTiles
        const colors = getStencilColors(metadata, vertPerTile)
        gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW)

        const bindSpiralPos = initAttribute(gl, this.program, 'spiralPos', POS_FPV, POS_STRIDE, 0)
        const bindColumnPos = initAttribute(gl, this.program, 'columnPos', POS_FPV, POS_STRIDE, POS_FPV)
        this.bindPositions = (): void => {
            bindSpiralPos()
            bindColumnPos()
        }
        this.bindColors = initAttribute(gl, this.program, 'color', COL_FPV, COL_STRIDE, 0)

        const projLoc = gl.getUniformLocation(this.program, 'proj')
        const viewLoc = gl.getUniformLocation(this.program, 'view')
        const shapeTLoc = gl.getUniformLocation(this.program, 'shapeT')
        this.setProj = (m: mat4): void => { gl.uniformMatrix4fv(projLoc, false, m) }
        this.setView = (m: mat4): void => { gl.uniformMatrix4fv(viewLoc, false, m) }
        this.setShapeT = (t: number): void => { gl.uniform1f(shapeTLoc, t) }
    }

    resize (gl: WebGLRenderingContext, w: number, h: number): void {
        const { framebuffer } = initTextureFramebuffer(gl, w, h)
        this.framebuffer = framebuffer
    }

    setPositions (gl: WebGLRenderingContext, positions: Float32Array): void {
        const newNumVertex = positions.length / POS_STRIDE
        if (newNumVertex !== this.numVertex) {
            throw new Error('Incorrect number of new position vertices')
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)
    }

    draw (gl: WebGLRenderingContext, shapeT: number, mousePos: [number, number]): void {
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer)
        gl.useProgram(this.program)

        gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer)
        this.bindPositions()
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colBuffer)
        this.bindColors()

        this.setShapeT(ease(shapeT))

        gl.drawArrays(gl.TRIANGLES, 0, this.numVertex)

        const pixels = new Uint8Array(4)
        gl.readPixels(...mousePos, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
        console.log(pixels)

        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    }
}

const indToColor = (i: number): [number, number] => {
    const si = i * 30
    const siMod = si % 256
    const siFract = si - siMod
    const r = siMod / 255
    const g = Math.floor(siFract / 255) / 255
    return [r, g]
}

const getStencilColors = (
    metadata: TileTextureMetadata,
    vertPerTile: number
): Float32Array => {
    const inds = []
    const colors = []
    for (let i = 0; i < metadata.numTiles; i++) {
        const color = indToColor(i)
        colors.push(color)
        const tileVerts = Array(vertPerTile).fill(color).flat()
        inds.push(...tileVerts)
    }
    return new Float32Array(inds)
}

export default StencilCoreRenderer

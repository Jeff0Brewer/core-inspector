import { mat4, vec2 } from 'gl-matrix'
import { initProgram, initBuffer, initAttribute, initTextureFramebuffer } from '../lib/gl-wrap'
import { ease } from '../lib/util'
import { POS_FPV, POS_STRIDE } from '../vis/core'
import { TileTextureMetadata } from '../lib/tile-texture'
import vertSource from '../shaders/stencil-vert.glsl?raw'
import fragSource from '../shaders/stencil-frag.glsl?raw'

const COL_FPV = 2
const COL_STRIDE = COL_FPV

type ColorIdMap = { [color: string]: number }

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

    colorIdMap: ColorIdMap
    currHovered: number

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
        const { colors, map } = getStencilColors(metadata, vertPerTile)
        gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW)
        this.colorIdMap = map

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

        this.currHovered = -1
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
        const colorHex = vecToHex([
            pixels[0] / 255,
            pixels[1] / 255
        ])

        this.currHovered = this.colorIdMap[colorHex] || -1

        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    }
}

const vecToHex = (v: Array<number>): string => {
    return v.map(x => Math.round(x * 255).toString(16)).join()
}

const indToColor = (i: number): { vec: vec2, hex: string } => {
    const si = (i + 1) * 30
    const siMod = si % 256
    const siFract = si - siMod
    const vec: vec2 = [
        siMod / 255,
        Math.floor(siFract / 255) / 255
    ]
    const hex = vecToHex(vec)
    return { vec, hex }
}

const getStencilColors = (
    metadata: TileTextureMetadata,
    vertPerTile: number
): {
    colors:Float32Array,
    map: ColorIdMap
} => {
    const colors = []
    const map: ColorIdMap = {}
    for (let i = 0; i < metadata.numTiles; i++) {
        const { vec, hex } = indToColor(i)
        const tileVerts = Array(vertPerTile).fill(vec).flat()
        colors.push(...tileVerts)
        map[hex] = i
    }
    return {
        colors: new Float32Array(colors),
        map
    }
}

export default StencilCoreRenderer

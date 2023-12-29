import { mat4, vec2 } from 'gl-matrix'
import { initProgram, initBuffer, initAttribute, initTextureFramebuffer } from '../lib/gl-wrap'
import { ease } from '../lib/util'
import { POS_FPV, POS_STRIDE } from '../vis/core'
import { TileTextureMetadata } from '../lib/tile-texture'
import { SectionIdMetadata } from '../lib/metadata'
import vertSource from '../shaders/stencil-vert.glsl?raw'
import fragSource from '../shaders/stencil-frag.glsl?raw'

const COL_FPV = 2
const COL_STRIDE = COL_FPV

// maps color picked from stencil framebuffer into core section id
type ColorIdMap = { [color: string]: string }

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
    positions: Float32Array

    colorIdMap: ColorIdMap

    currHovered: string | undefined
    lastMousePos: [number, number]

    constructor (
        gl: WebGLRenderingContext,
        positions: Float32Array,
        tileMetadata: TileTextureMetadata,
        idMetadata: SectionIdMetadata
    ) {
        // placeholder dimensions for framebuffer so init can happen before canvas resized
        const { framebuffer } = initTextureFramebuffer(gl, 1, 1)
        this.framebuffer = framebuffer

        this.program = initProgram(gl, vertSource, fragSource)

        this.numVertex = positions.length / POS_STRIDE
        this.posBuffer = initBuffer(gl)
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)
        this.positions = positions

        const vertPerTile = this.numVertex / tileMetadata.numTiles
        this.colBuffer = initBuffer(gl)
        const { colors, map } = getStencilColors(tileMetadata, idMetadata, vertPerTile)
        gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW)
        this.colorIdMap = map

        const bindSpiralPos = initAttribute(gl, this.program, 'spiralPos', POS_FPV, POS_STRIDE, 0)
        const bindColumnPos = initAttribute(gl, this.program, 'columnPos', POS_FPV, POS_STRIDE, POS_FPV)
        this.bindPositions = (): void => {
            bindSpiralPos()
            bindColumnPos()
        }
        this.bindColors = initAttribute(gl, this.program, 'color', COL_FPV, COL_STRIDE, 0, gl.UNSIGNED_BYTE)

        const projLoc = gl.getUniformLocation(this.program, 'proj')
        const viewLoc = gl.getUniformLocation(this.program, 'view')
        const shapeTLoc = gl.getUniformLocation(this.program, 'shapeT')
        this.setProj = (m: mat4): void => { gl.uniformMatrix4fv(projLoc, false, m) }
        this.setView = (m: mat4): void => { gl.uniformMatrix4fv(viewLoc, false, m) }
        this.setShapeT = (t: number): void => { gl.uniform1f(shapeTLoc, t) }

        this.currHovered = undefined
        this.lastMousePos = [-1, -1]
    }

    setHovered (id: string | undefined): void {
        this.currHovered = id
    }

    setPositions (gl: WebGLRenderingContext, positions: Float32Array): void {
        const newNumVertex = positions.length / POS_STRIDE
        if (newNumVertex !== this.numVertex) {
            throw new Error('Incorrect number of new position vertices')
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)

        this.positions = positions
    }

    // need to call resize as well as update projection matrix when window changes
    // since stencil buffer is offscreen texture framebuffer and needs to match window size
    resize (gl: WebGLRenderingContext, w: number, h: number): void {
        const { framebuffer } = initTextureFramebuffer(gl, w, h)
        this.framebuffer = framebuffer
    }

    // check if stencil framebuffer should be read, want to minimize readPixels calls
    // so only read when mouse has moved and shape is not currently transforming
    checkHoverChange (shapeT: number, mousePos: [number, number]): boolean {
        const shapeNotChanging = shapeT === 0 || shapeT === 1

        const mousePosChanged =
            this.lastMousePos[0] !== mousePos[0] ||
            this.lastMousePos[1] !== mousePos[1]

        return mousePosChanged && shapeNotChanging
    }

    draw (
        gl: WebGLRenderingContext,
        view: mat4,
        shapeT: number,
        mousePos: [number, number],
        setHovered: (id: string) => void
    ): void {
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer)
        gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT)
        gl.useProgram(this.program)

        gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer)
        this.bindPositions()
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colBuffer)
        this.bindColors()

        this.setView(view)
        this.setShapeT(ease(shapeT))

        gl.drawArrays(gl.TRIANGLES, 0, this.numVertex)

        // mouse position is tracked here instead of using an event listener
        // so that pixels can be read directly after draw
        if (this.checkHoverChange(shapeT, mousePos)) {
            const pixels = new Uint8Array(4)
            gl.readPixels(...mousePos, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels)

            const colorHex = vecToHex([pixels[0], pixels[1]])
            this.currHovered = this.colorIdMap[colorHex]
            setHovered(this.currHovered)
        }
        this.lastMousePos = mousePos

        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    }
}

const vecToHex = (v: Array<number>): string => {
    return v.map(x => x.toString(16)).join()
}

const indToColor = (i: number): { vec: vec2, hex: string } => {
    // scale index to make colors more distinct
    // add one to index to prevent [0, 0] color
    const ind = (i + 1) * 30

    const mod = ind % 256
    const fract = Math.floor((ind - mod) / 255)

    const vec: vec2 = [mod, fract]
    const hex = vecToHex(vec)

    return { vec, hex }
}

const getStencilColors = (
    tileMetadata: TileTextureMetadata,
    idMetadata: SectionIdMetadata,
    vertPerTile: number
): {
    colors: Uint8Array,
    map: ColorIdMap
} => {
    const colors = []
    const map: ColorIdMap = {}
    for (let i = 0; i < tileMetadata.numTiles; i++) {
        const { vec, hex } = indToColor(i)
        const tileVerts = Array(vertPerTile).fill(vec).flat()
        colors.push(...tileVerts)
        map[hex] = idMetadata.ids[i]
    }
    return {
        colors: new Uint8Array(colors),
        map
    }
}

export default StencilCoreRenderer

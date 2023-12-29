import { mat4, vec2 } from 'gl-matrix'
import { initProgram, initBuffer, initAttribute, initTextureFramebuffer } from '../lib/gl-wrap'
import { ease } from '../lib/util'
import { POS_FPV, POS_STRIDE } from '../vis/core'
import { TileTextureMetadata } from '../lib/tile-texture'
import { SectionIdMetadata } from '../lib/metadata'
import HoverHighlight from '../vis/hover-highlight'
import vertSource from '../shaders/stencil-vert.glsl?raw'
import fragSource from '../shaders/stencil-frag.glsl?raw'

const COL_FPV = 2
const COL_STRIDE = COL_FPV

// maps color picked from stencil framebuffer into core section id
type ColorIdMap = { [color: string]: string }

type IdIndMap = { [id: string]: number }

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
    floatPerTile: number
    positions: Float32Array

    highlight: HoverHighlight

    idIndMap: IdIndMap
    colorIdMap: ColorIdMap
    lastHovered: string | undefined
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

        this.numVertex = positions.length / POS_STRIDE
        const vertPerTile = this.numVertex / tileMetadata.numTiles
        this.floatPerTile = vertPerTile * POS_STRIDE
        this.positions = positions

        this.idIndMap = {}
        Object.entries(idMetadata.ids).forEach(
            ([ind, id]) => { this.idIndMap[id] = parseInt(ind) }
        )
        this.highlight = new HoverHighlight(gl)

        this.framebuffer = framebuffer

        this.program = initProgram(gl, vertSource, fragSource)

        this.posBuffer = initBuffer(gl)
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)

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
        this.lastHovered = undefined

        this.lastMousePos = [-1, -1]
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

        this.positions = positions
    }

    checkHoverChange (shapeT: number, mousePos: [number, number]): boolean {
        const shapeNotChanging = shapeT === 0 || shapeT === 1

        const mousePosChanged =
            this.lastMousePos[0] !== mousePos[0] ||
            this.lastMousePos[1] !== mousePos[1]
        this.lastMousePos = [...mousePos]

        return mousePosChanged && shapeNotChanging
    }

    draw (
        gl: WebGLRenderingContext,
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

        this.setShapeT(ease(shapeT))

        gl.drawArrays(gl.TRIANGLES, 0, this.numVertex)

        // mouse position is tracked here instead of using an event listener
        // so that pixels can be read directly after draw
        //
        // pixels are only read when the mouse has moved and the
        // core isn't currently transforming shape for performance
        if (this.checkHoverChange(shapeT, mousePos)) {
            const pixels = new Uint8Array(4)
            gl.readPixels(...mousePos, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels)

            const colorHex = vecToHex([pixels[0], pixels[1]])
            this.currHovered = this.colorIdMap[colorHex]
            if (this.currHovered !== this.lastHovered) {
                if (this.currHovered) {
                    const hoveredInd = this.idIndMap[this.currHovered]
                    const si = hoveredInd * this.floatPerTile
                    const ei = si + this.floatPerTile
                    this.highlight.setPositions(gl, this.positions.slice(si, ei))
                } else {
                    this.highlight.setPositions(gl, new Float32Array())
                }
            }
            this.lastHovered = this.currHovered

            setHovered(this.currHovered)
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, null)

        this.highlight.draw(gl, shapeT)
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

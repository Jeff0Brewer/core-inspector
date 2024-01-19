import { mat4, vec2 } from 'gl-matrix'
import { initProgram, initBuffer, initAttribute, initTextureFramebuffer } from '../lib/gl-wrap'
import { vecToHex } from '../lib/util'
import { POS_FPV } from '../vis/core'
import { TileTextureMetadata } from '../lib/tile-texture'
import { SectionIdMetadata } from '../lib/metadata'
import vertSource from '../shaders/stencil-vert.glsl?raw'
import fragSource from '../shaders/stencil-frag.glsl?raw'

// maps color picked from stencil framebuffer into core section id
type ColorIdMap = { [color: string]: string }

// only need 2 color channels to represent enough unique colors
const COL_FPV = 2

// stencil renderer for mouse interactions, draws each segment as a
// unique color and reads pixels under the mouse to determine which
// segment is currently hovered
class StencilCoreRenderer {
    framebuffer: WebGLFramebuffer
    program: WebGLProgram
    positionBuffer: WebGLBuffer
    colorBuffer: WebGLBuffer
    bindPosition: () => void
    bindColors: () => void
    setProj: (m: mat4) => void
    setView: (m: mat4) => void
    numVertex: number

    colorIdMap: ColorIdMap

    currHovered: string | undefined
    lastMousePos: [number, number]

    constructor (
        gl: WebGLRenderingContext,
        positions: Float32Array,
        tileMetadata: TileTextureMetadata,
        idMetadata: SectionIdMetadata,
        currHovered: string | undefined
    ) {
        // placeholder dimensions for framebuffer so init can happen before canvas resized
        const { framebuffer } = initTextureFramebuffer(gl, 1, 1)
        this.framebuffer = framebuffer

        this.program = initProgram(gl, vertSource, fragSource)

        this.numVertex = positions.length / POS_FPV
        // assume same number of vertices for each tile
        const vertPerTile = this.numVertex / tileMetadata.numTiles

        // positions passed in as argument since exactly the same as downscaled
        // representation, can reuse here and prevent extra vertex generation
        this.positionBuffer = initBuffer(gl)
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)

        this.colorBuffer = initBuffer(gl)
        const { colors, map } = getStencilColors(tileMetadata, idMetadata, vertPerTile)
        gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW)
        this.colorIdMap = map

        this.bindPosition = initAttribute(gl, this.program, 'position', POS_FPV, POS_FPV, 0)
        this.bindColors = initAttribute(gl, this.program, 'color', COL_FPV, COL_FPV, 0, gl.UNSIGNED_BYTE)

        const projLoc = gl.getUniformLocation(this.program, 'proj')
        const viewLoc = gl.getUniformLocation(this.program, 'view')
        this.setProj = (m: mat4): void => { gl.uniformMatrix4fv(projLoc, false, m) }
        this.setView = (m: mat4): void => { gl.uniformMatrix4fv(viewLoc, false, m) }

        this.currHovered = currHovered
        this.lastMousePos = [-1, -1]
    }

    setHovered (id: string | undefined): void {
        this.currHovered = id
    }

    setPositions (
        gl: WebGLRenderingContext,
        positions: Float32Array
    ): void {
        const newNumVertex = positions.length / POS_FPV
        if (newNumVertex !== this.numVertex) {
            throw new Error('Incorrect number of new position vertices')
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)
    }

    // need to call resize as well as update projection matrix when window changes
    // since stencil buffer is offscreen texture framebuffer and needs to match window size
    resize (gl: WebGLRenderingContext, w: number, h: number): void {
        const { framebuffer } = initTextureFramebuffer(gl, w, h)
        this.framebuffer = framebuffer
    }

    // check if stencil framebuffer should be updated, want to minimize draws and reads,
    // ensure mouse has moved and shape is not currently transforming
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
        // only update stencil framebuffer and read pixels if
        // hover has potentially changed
        if (!this.checkHoverChange(shapeT, mousePos)) {
            return
        }
        this.lastMousePos = mousePos

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer)
        gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT)

        gl.useProgram(this.program)

        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer)
        this.bindPosition()
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer)
        this.bindColors()
        this.setView(view)

        gl.drawArrays(gl.TRIANGLES, 0, this.numVertex)

        // read pixels immediately after draw to ensure render not in progress
        // and colors are readable
        const pixels = new Uint8Array(4)
        gl.readPixels(...mousePos, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels)

        const colorHex = vecToHex([pixels[0], pixels[1]])
        const newHovered = this.colorIdMap[colorHex]
        if (this.currHovered !== newHovered) {
            this.currHovered = newHovered
            setHovered(this.currHovered)
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    }
}

// get unique color for each tile id, return buffer for rendering and
// map for converting rendered color to original id
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

const indToColor = (i: number): { vec: vec2, hex: string } => {
    // scale index to make colors more distinct,
    // add one to index to prevent [0, 0] color
    const ind = (i + 1) * 30

    const mod = ind % 256
    const fract = Math.floor((ind - mod) / 255)
    const vec: vec2 = [mod, fract]
    const hex = vecToHex(vec)

    return { vec, hex }
}

export default StencilCoreRenderer

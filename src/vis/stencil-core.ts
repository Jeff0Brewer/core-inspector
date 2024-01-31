import { mat4, vec2 } from 'gl-matrix'
import { GlContext, GlProgram, GlBuffer, GlTextureFramebuffer } from '../lib/gl-wrap'
import { bytesToHex } from '../lib/util'
import { POS_FPV } from '../lib/vert-gen'
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
    framebuffer: GlTextureFramebuffer
    program: GlProgram
    positionBuffer: GlBuffer
    colorBuffer: GlBuffer
    setProj: (m: mat4) => void
    setView: (m: mat4) => void
    numVertex: number
    lastMousePos: vec2
    colorIdMap: ColorIdMap
    setHovered: (id: string | undefined) => void

    constructor (
        gl: GlContext,
        positions: Float32Array,
        tileMetadata: TileTextureMetadata,
        idMetadata: SectionIdMetadata,
        setHovered: (id: string | undefined) => void
    ) {
        this.setHovered = setHovered
        this.lastMousePos = [-1, -1]

        this.numVertex = positions.length / POS_FPV
        // assume same number of vertices for each tile
        const vertPerTile = this.numVertex / tileMetadata.numTiles

        // placeholder dimensions for framebuffer so init can happen before canvas resized
        this.framebuffer = new GlTextureFramebuffer(gl, 1, 1)
        this.program = new GlProgram(gl, vertSource, fragSource)

        // positions passed in as argument since exactly the same as downscaled
        // representation, can reuse here and prevent extra vertex generation
        this.positionBuffer = new GlBuffer(gl)
        this.positionBuffer.setData(gl, positions)
        this.positionBuffer.addAttribute(gl, this.program, 'position', POS_FPV, POS_FPV, 0)

        const { colors, map } = getStencilColors(tileMetadata, idMetadata, vertPerTile)
        this.colorIdMap = map
        this.colorBuffer = new GlBuffer(gl)
        this.colorBuffer.setData(gl, colors)
        this.colorBuffer.addAttribute(gl, this.program, 'color', COL_FPV, COL_FPV, 0, gl.UNSIGNED_BYTE)

        const projLoc = this.program.getUniformLocation(gl, 'proj')
        const viewLoc = this.program.getUniformLocation(gl, 'view')
        this.setProj = (m: mat4): void => {
            this.program.bind(gl)
            gl.uniformMatrix4fv(projLoc, false, m)
        }
        this.setView = (m: mat4): void => { gl.uniformMatrix4fv(viewLoc, false, m) }
    }

    // set positions externally because using same triangle vertices as
    // downscaled representation, can reuse here
    setPositions (gl: GlContext, positions: Float32Array): void {
        this.positionBuffer.setData(gl, positions)
    }

    // need to call resize as well as update projection matrix when window changes
    // since stencil buffer is offscreen texture framebuffer and needs to match window size
    resize (gl: GlContext, w: number, h: number): void {
        this.framebuffer = new GlTextureFramebuffer(gl, w, h)
    }

    // check if stencil framebuffer should be updated, want to minimize draws and reads,
    // ensure mouse has moved and shape is not currently transforming
    checkHoverChange (shapeT: number, mousePos: vec2): boolean {
        const shapeNotChanging = shapeT === 0 || shapeT === 1

        const mousePosChanged =
            this.lastMousePos[0] !== mousePos[0] ||
            this.lastMousePos[1] !== mousePos[1]

        // store mouse pos for next comparison
        this.lastMousePos = mousePos

        return mousePosChanged && shapeNotChanging
    }

    draw (gl: GlContext, view: mat4, shapeT: number, mousePos: vec2): void {
        // only update stencil framebuffer and read pixels if
        // hover has potentially changed
        if (!this.checkHoverChange(shapeT, mousePos)) {
            return
        }

        this.framebuffer.bind(gl)
        this.program.bind(gl)
        this.positionBuffer.bind(gl)
        this.colorBuffer.bind(gl)
        this.setView(view)

        gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT)
        gl.drawArrays(gl.TRIANGLES, 0, this.numVertex)

        // read pixels immediately after draw to ensure render not
        // in progress and colors are readable
        const pixels = new Uint8Array(4)
        gl.readPixels(mousePos[0], mousePos[1], 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels)

        // get hovered id from color and update state
        const colorHex = bytesToHex([pixels[0], pixels[1]])
        this.setHovered(this.colorIdMap[colorHex])

        // reset to default framebuffer once completed
        this.framebuffer.unbind(gl)
    }

    drop (gl: GlContext): void {
        this.framebuffer.drop(gl)
        this.program.drop(gl)
        this.positionBuffer.drop(gl)
        this.colorBuffer.drop(gl)
    }
}

// get unique color for each tile id, return buffer for rendering colors
// and map for converting rendered color to original id
const getStencilColors = (
    tileMetadata: TileTextureMetadata,
    idMetadata: SectionIdMetadata,
    vertPerTile: number
): {
    colors: Uint8Array,
    map: ColorIdMap
} => {
    const map: ColorIdMap = {}
    const colors = new Uint8Array(tileMetadata.numTiles * vertPerTile * COL_FPV)
    let offset = 0

    for (let i = 0; i < tileMetadata.numTiles; i++) {
        const { hex, vec } = indToColor(i)

        map[hex] = idMetadata.ids[i]

        // fill buffer with same color for all vertices of tile
        const tileColors = Array(vertPerTile).fill(vec).flat()
        colors.set(tileColors, offset)
        offset += tileColors.length
    }

    return { colors, map }
}

// converts index to unique color, returns vec representation for use in
// color buffer and hex representation for use in hash map
const indToColor = (i: number): { vec: vec2, hex: string } => {
    // scale index to make colors more distinct,
    // add one to index to prevent [0, 0] color
    const ind = (i + 1) * 30

    const mod = ind % 256
    const fract = Math.floor((ind - mod) / 255)

    const vec: vec2 = [mod, fract]
    const hex = bytesToHex(vec)

    return { vec, hex }
}

export default StencilCoreRenderer

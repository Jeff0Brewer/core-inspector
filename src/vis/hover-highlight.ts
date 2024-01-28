import { mat4, vec2 } from 'gl-matrix'
import { GlContext, GlProgram, GlBuffer } from '../lib/gl-wrap'
import { POS_FPV } from '../lib/vert-gen'
import { TileTextureMetadata } from '../lib/tile-texture'
import { SectionIdMetadata } from '../lib/metadata'
import vertSource from '../shaders/hover-highlight-vert.glsl?raw'
import fragSource from '../shaders/hover-highlight-frag.glsl?raw'

// map from section id to vertex start / end indices
type IdIndMap = { [id: string]: [number, number] }

class HoverHighlightRenderer {
    program: GlProgram
    buffer: GlBuffer
    setProj: (m: mat4) => void
    setView: (m: mat4) => void
    setMousePos: (p: vec2) => void
    setWindowHeight: (h: number) => void
    positions: Float32Array
    numVertex: number
    lastHovered: string | undefined
    idIndMap: IdIndMap

    constructor (
        gl: GlContext,
        positions: Float32Array,
        tileMetadata: TileTextureMetadata,
        idMetadata: SectionIdMetadata
    ) {
        this.positions = positions
        this.lastHovered = undefined
        this.numVertex = 0

        // get map from section id to section start and end indices in position buffer,
        // useful when getting offsets into position buffer for highlighted section vertices.
        // assumes that all tiles have same number of vertices
        const floatPerTile = positions.length / tileMetadata.numTiles
        this.idIndMap = {}
        Object.entries(idMetadata.ids).forEach(
            ([ind, id]) => {
                const tileInd = parseInt(ind)
                const start = tileInd * floatPerTile
                const end = (tileInd + 1) * floatPerTile
                this.idIndMap[id] = [start, end]
            }
        )

        this.program = new GlProgram(gl, vertSource, fragSource)

        this.buffer = new GlBuffer(gl)
        this.buffer.addAttribute(gl, this.program, 'position', POS_FPV, POS_FPV, 0)

        const projLoc = this.program.getUniformLocation(gl, 'proj')
        const viewLoc = this.program.getUniformLocation(gl, 'view')
        const mousePosLoc = this.program.getUniformLocation(gl, 'mousePos')
        const windowHeightLoc = this.program.getUniformLocation(gl, 'windowHeight')
        this.setProj = (m: mat4): void => { gl.uniformMatrix4fv(projLoc, false, m) }
        this.setView = (m: mat4): void => { gl.uniformMatrix4fv(viewLoc, false, m) }
        this.setMousePos = (p: vec2): void => { gl.uniform2fv(mousePosLoc, p) }
        this.setWindowHeight = (h: number): void => {
            this.program.bind(gl)
            gl.uniform1f(windowHeightLoc, h)
        }
    }

    // copy verts for current hovered section from positions array
    // into highlight buffer for drawing
    setHovered (gl: GlContext, id: string | undefined): void {
        // don't update if hovered id hasn't changed
        if (id === this.lastHovered) { return }
        this.lastHovered = id

        if (id === undefined) {
            this.buffer.setData(gl, new Float32Array())
            this.numVertex = 0
        } else {
            const sectionVerts = this.positions.slice(...this.idIndMap[id])
            this.buffer.setData(gl, sectionVerts)
            this.numVertex = sectionVerts.length / POS_FPV
        }
    }

    // store reference to triangle section vertices from downscaled representation
    // so that single section can be copied into highlight position buffer on hover change
    setPositions (positions: Float32Array): void {
        this.positions = positions
    }

    draw (gl: GlContext, view: mat4, mousePos: vec2): void {
        if (this.numVertex === 0) { return }

        this.program.bind(gl)
        this.buffer.bind(gl)
        this.setView(view)
        this.setMousePos(mousePos)

        gl.drawArrays(gl.TRIANGLES, 0, this.numVertex)
    }

    drop (gl: GlContext): void {
        this.program.drop(gl)
        this.buffer.drop(gl)
    }
}

export default HoverHighlightRenderer

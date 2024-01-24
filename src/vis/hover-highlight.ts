import { mat4 } from 'gl-matrix'
import { GlContext, GlProgram, GlBuffer } from '../lib/gl-wrap'
import { POS_FPV } from '../vis/core'
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
        // get map from section id to section start and end indices in position buffer,
        // useful when getting offsets into position buffer for highlighted section
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

        this.positions = positions
        this.numVertex = 0

        this.program = new GlProgram(gl, vertSource, fragSource)
        this.buffer = new GlBuffer(gl)
        this.buffer.addAttribute(gl, this.program, 'position', POS_FPV, POS_FPV, 0)

        const projLoc = this.program.getUniformLocation(gl, 'proj')
        const viewLoc = this.program.getUniformLocation(gl, 'view')
        this.setProj = (m: mat4): void => { gl.uniformMatrix4fv(projLoc, false, m) }
        this.setView = (m: mat4): void => { gl.uniformMatrix4fv(viewLoc, false, m) }

        this.lastHovered = undefined
    }

    // copy verts for current section from positions array into highlight buffer for drawing
    setHovered (gl: GlContext, id: string | undefined): void {
        if (id === this.lastHovered) { return }
        this.lastHovered = id

        const sectionVerts = id !== undefined
            ? this.positions.slice(...this.idIndMap[id])
            : new Float32Array()

        this.numVertex = sectionVerts.length / POS_FPV
        this.buffer.setData(gl, sectionVerts)
    }

    setPositions (positions: Float32Array): void {
        this.positions = positions
    }

    draw (gl: GlContext, view: mat4): void {
        if (this.numVertex === 0) { return }

        this.program.bind(gl)
        this.buffer.bind(gl)
        this.setView(view)

        gl.drawArrays(gl.TRIANGLES, 0, this.numVertex)
    }
}

export default HoverHighlightRenderer

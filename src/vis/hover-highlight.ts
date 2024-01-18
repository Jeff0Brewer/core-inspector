import { mat4 } from 'gl-matrix'
import { initProgram, initBuffer, initAttribute } from '../lib/gl-wrap'
import { POS_FPV } from '../vis/core'
import { TileTextureMetadata } from '../lib/tile-texture'
import { SectionIdMetadata } from '../lib/metadata'
import vertSource from '../shaders/hover-highlight-vert.glsl?raw'
import fragSource from '../shaders/hover-highlight-frag.glsl?raw'

type IdIndMap = { [id: string]: [number, number] }

class HoverHighlightRenderer {
    idIndMap: IdIndMap

    program: WebGLProgram
    positionBuffer: WebGLBuffer
    bindPosition: () => void
    setProj: (m: mat4) => void
    setView: (m: mat4) => void
    positions: Float32Array
    numVertex: number

    lastHovered: string | undefined

    constructor (
        gl: WebGLRenderingContext,
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

        this.program = initProgram(gl, vertSource, fragSource)

        this.positionBuffer = initBuffer(gl)
        this.bindPosition = initAttribute(gl, this.program, 'position', POS_FPV, POS_FPV, 0)

        const projLoc = gl.getUniformLocation(this.program, 'proj')
        const viewLoc = gl.getUniformLocation(this.program, 'view')
        this.setProj = (m: mat4): void => { gl.uniformMatrix4fv(projLoc, false, m) }
        this.setView = (m: mat4): void => { gl.uniformMatrix4fv(viewLoc, false, m) }

        this.lastHovered = undefined
    }

    setPositions (positions: Float32Array): void {
        this.positions = positions
    }

    // copy verts for current section from position buffer into highlight buffer,
    // could keep all positions in gpu and only draw required verts, but want to save gpu memory
    setHovered (gl: WebGLRenderingContext, id: string | undefined): void {
        if (id === this.lastHovered) { return }
        this.lastHovered = id

        let sectionVerts
        if (id) {
            const [start, end] = this.idIndMap[id]
            sectionVerts = this.positions.slice(start, end)
        } else {
            sectionVerts = new Float32Array()
        }
        this.numVertex = sectionVerts.length / POS_FPV
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, sectionVerts, gl.STATIC_DRAW)
    }

    draw (gl: WebGLRenderingContext, view: mat4): void {
        if (this.numVertex === 0) { return }

        gl.useProgram(this.program)

        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer)
        this.bindPosition()

        this.setView(view)

        gl.drawArrays(gl.TRIANGLES, 0, this.numVertex)
    }
}

export default HoverHighlightRenderer

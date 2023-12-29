import { mat4 } from 'gl-matrix'
import { initProgram, initBuffer, initAttribute } from '../lib/gl-wrap'
import { ease } from '../lib/util'
import { POS_FPV, POS_STRIDE } from '../vis/core'
import { TileTextureMetadata } from '../lib/tile-texture'
import { SectionIdMetadata } from '../lib/metadata'
import vertSource from '../shaders/highlight-vert.glsl?raw'
import fragSource from '../shaders/highlight-frag.glsl?raw'

type IdIndMap = { [id: string]: [number, number] }

class HoverHighlightRenderer {
    idIndMap: IdIndMap

    program: WebGLProgram
    buffer: WebGLBuffer
    bindAttrib: () => void
    setProj: (m: mat4) => void
    setView: (m: mat4) => void
    setShapeT: (t: number) => void
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

        this.program = initProgram(gl, vertSource, fragSource)
        this.buffer = initBuffer(gl)
        this.positions = positions
        this.numVertex = 0

        const bindSpiralPos = initAttribute(gl, this.program, 'spiralPos', POS_FPV, POS_STRIDE, 0)
        const bindColumnPos = initAttribute(gl, this.program, 'columnPos', POS_FPV, POS_STRIDE, POS_FPV)
        this.bindAttrib = (): void => {
            bindSpiralPos()
            bindColumnPos()
        }

        const projLoc = gl.getUniformLocation(this.program, 'proj')
        const viewLoc = gl.getUniformLocation(this.program, 'view')
        const shapeTLoc = gl.getUniformLocation(this.program, 'shapeT')
        this.setProj = (m: mat4): void => { gl.uniformMatrix4fv(projLoc, false, m) }
        this.setView = (m: mat4): void => { gl.uniformMatrix4fv(viewLoc, false, m) }
        this.setShapeT = (t: number): void => { gl.uniform1f(shapeTLoc, t) }

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
        this.numVertex = sectionVerts.length / POS_STRIDE
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer)
        gl.bufferData(gl.ARRAY_BUFFER, sectionVerts, gl.STATIC_DRAW)
    }

    draw (gl: WebGLRenderingContext, view: mat4, shapeT: number): void {
        if (this.numVertex === 0) { return }

        gl.useProgram(this.program)

        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer)
        this.bindAttrib()

        this.setView(view)
        this.setShapeT(ease(shapeT))

        gl.drawArrays(gl.TRIANGLES, 0, this.numVertex)
    }
}

export default HoverHighlightRenderer

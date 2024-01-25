import { mat4, vec2 } from 'gl-matrix'
import { GlContext, GlProgram, GlBuffer } from '../lib/gl-wrap'
import { POS_FPV, TEX_FPV, CoreShape } from '../vis/core'
import { TileRect } from '../lib/tile-texture'
import MineralBlender from '../vis/mineral-blend'
import vertSource from '../shaders/downscaled-vert.glsl?raw'
import fragSource from '../shaders/downscaled-frag.glsl?raw'

class DownscaledCoreRenderer {
    minerals: MineralBlender
    program: GlProgram
    spiralPosBuffer: GlBuffer
    columnPosBuffer: GlBuffer
    texCoordBuffer: GlBuffer
    setProj: (m: mat4) => void
    setView: (m: mat4) => void
    setShapeT: (t: number) => void
    numVertex: number

    constructor (
        gl: GlContext,
        minerals: MineralBlender,
        positions: Float32Array,
        texCoords: Float32Array,
        shape: CoreShape
    ) {
        this.minerals = minerals
        this.numVertex = texCoords.length / TEX_FPV

        this.program = new GlProgram(gl, vertSource, fragSource)

        this.texCoordBuffer = new GlBuffer(gl)
        this.texCoordBuffer.setData(gl, texCoords)
        this.texCoordBuffer.addAttribute(gl, this.program, 'texCoord', TEX_FPV, TEX_FPV, 0)

        this.spiralPosBuffer = new GlBuffer(gl)
        this.spiralPosBuffer.setData(
            gl,
            shape === 'spiral'
                ? positions
                : new Float32Array(positions.length)
        )
        this.spiralPosBuffer.addAttribute(gl, this.program, 'spiralPos', POS_FPV, POS_FPV, 0)

        this.columnPosBuffer = new GlBuffer(gl)
        this.columnPosBuffer.setData(
            gl,
            shape === 'column'
                ? positions
                : new Float32Array(positions.length)
        )
        this.columnPosBuffer.addAttribute(gl, this.program, 'columnPos', POS_FPV, POS_FPV, 0)

        const projLoc = this.program.getUniformLocation(gl, 'proj')
        const viewLoc = this.program.getUniformLocation(gl, 'view')
        const shapeTLoc = this.program.getUniformLocation(gl, 'shapeT')
        this.setProj = (m: mat4): void => { gl.uniformMatrix4fv(projLoc, false, m) }
        this.setView = (m: mat4): void => { gl.uniformMatrix4fv(viewLoc, false, m) }
        this.setShapeT = (t: number): void => { gl.uniform1f(shapeTLoc, t) }
    }

    // generate vertices externally to coordinate alignment between
    // punchcard and downscaled representations
    setPositions (gl: GlContext, positions: Float32Array, shape: CoreShape): void {
        if (shape === 'spiral') {
            this.spiralPosBuffer.setData(gl, positions)
        } else {
            this.columnPosBuffer.setData(gl, positions)
        }
    }

    draw (
        gl: GlContext,
        view: mat4,
        shapeT: number
    ): void {
        this.program.bind(gl)

        this.minerals.bind(gl)
        this.spiralPosBuffer.bind(gl)
        this.columnPosBuffer.bind(gl)
        this.texCoordBuffer.bind(gl)
        this.setView(view)
        this.setShapeT(shapeT)

        gl.drawArrays(gl.TRIANGLES, 0, this.numVertex)
    }

    drop (gl: GlContext): void {
        this.minerals.drop(gl)
        this.program.drop(gl)
        this.spiralPosBuffer.drop(gl)
        this.columnPosBuffer.drop(gl)
        this.texCoordBuffer.drop(gl)
    }
}

const NUM_ROWS = 12
const VERT_PER_ROW = 6
const VERT_PER_TILE = NUM_ROWS * VERT_PER_ROW

const addDownscaledAttrib = (
    out: Float32Array,
    offset: number,
    getRowAttrib: (i: number) => [Array<number>, Array<number>],
    floatsPerVertex: number
): void => {
    let bufInd = 0
    const attribs = new Float32Array(VERT_PER_TILE * floatsPerVertex)

    for (let i = 0; i < NUM_ROWS; i++) {
        const [inner, outer] = getRowAttrib(i)
        const [nextInner, nextOuter] = getRowAttrib(i + 1)

        attribs.set(inner, bufInd)
        bufInd += floatsPerVertex

        attribs.set(outer, bufInd)
        bufInd += floatsPerVertex

        attribs.set(nextOuter, bufInd)
        bufInd += floatsPerVertex

        attribs.set(nextOuter, bufInd)
        bufInd += floatsPerVertex

        attribs.set(nextInner, bufInd)
        bufInd += floatsPerVertex

        attribs.set(inner, bufInd)
        bufInd += floatsPerVertex
    }
    out.set(attribs, offset)
}

const addDownscaledTexCoords = (
    out: Float32Array,
    offset: number,
    rect: TileRect
): void => {
    const heightInc = rect.height / NUM_ROWS
    const getRowCoords = (i: number): [Array<number>, Array<number>] => {
        const inner = [
            rect.left,
            rect.top + heightInc * i
        ]
        const outer = [
            rect.left + rect.width,
            rect.top + heightInc * i
        ]
        return [inner, outer]
    }
    addDownscaledAttrib(out, offset, getRowCoords, TEX_FPV)
}

const addDownscaledSpiralPositions = (
    out: Float32Array,
    offset: number,
    currRadius: number,
    currAngle: number,
    tileRadius: number,
    tileAngle: number,
    tileWidth: number
): void => {
    const angleInc = tileAngle / NUM_ROWS
    const radiusInc = tileRadius / NUM_ROWS

    const getRowSpiralPositions = (i: number): [Array<number>, Array<number>] => {
        const angle = currAngle + angleInc * i
        const radius = currRadius + radiusInc * i

        const inner = [
            Math.cos(angle) * (radius + tileWidth * 0.5),
            Math.sin(angle) * (radius + tileWidth * 0.5)
        ]

        const outer = [
            Math.cos(angle) * (radius - tileWidth * 0.5),
            Math.sin(angle) * (radius - tileWidth * 0.5)
        ]

        return [inner, outer]
    }

    addDownscaledAttrib(out, offset, getRowSpiralPositions, POS_FPV)
}

const addDownscaledColumnPositions = (
    out: Float32Array,
    offset: number,
    currColumnX: number,
    currColumnY: number,
    tileHeight: number,
    tileWidth: number
): void => {
    const columnYInc = tileHeight / NUM_ROWS

    const getRowColumnPositions = (i: number): [Array<number>, Array<number>] => {
        const columnY = currColumnY - columnYInc * i
        const columnX = currColumnX

        const inner = [columnX, columnY]
        const outer = [columnX + tileWidth, columnY]
        return [inner, outer]
    }

    addDownscaledAttrib(out, offset, getRowColumnPositions, POS_FPV)
}

export default DownscaledCoreRenderer
export {
    addDownscaledSpiralPositions,
    addDownscaledColumnPositions,
    addDownscaledTexCoords,
    NUM_ROWS,
    VERT_PER_ROW
}

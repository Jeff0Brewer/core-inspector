import { mat4 } from 'gl-matrix'
import { GlContext, GlProgram, GlBuffer } from '../lib/gl-wrap'
import { POS_FPV, TEX_FPV, CoreShape } from '../vis/core'
import { TileRect } from '../lib/tile-texture'
import MineralBlender from '../vis/mineral-blend'
import vertSource from '../shaders/punchcard-vert.glsl?raw'
import fragSource from '../shaders/punchcard-frag.glsl?raw'

class PunchcardCoreRenderer {
    minerals: MineralBlender
    program: GlProgram
    spiralPosBuffer: GlBuffer
    columnPosBuffer: GlBuffer
    texCoordBuffer: GlBuffer
    setProj: (m: mat4) => void
    setView: (m: mat4) => void
    setShapeT: (t: number) => void
    setDpr: (r: number) => void
    incPointSize: (d: number) => void
    numVertex: number

    constructor (
        gl: GlContext,
        minerals: MineralBlender,
        positions: Float32Array,
        texCoords: Float32Array,
        pointSize: number,
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
        const dprLoc = this.program.getUniformLocation(gl, 'dpr')
        this.setProj = (m: mat4): void => { gl.uniformMatrix4fv(projLoc, false, m) }
        this.setView = (m: mat4): void => { gl.uniformMatrix4fv(viewLoc, false, m) }
        this.setShapeT = (t: number): void => { gl.uniform1f(shapeTLoc, t) }
        this.setDpr = (r: number): void => { gl.uniform1f(dprLoc, r) }

        const pointSizeLoc = this.program.getUniformLocation(gl, 'pointSize')
        this.incPointSize = (delta: number): void => {
            this.program.bind(gl)
            pointSize = Math.max(1, pointSize + delta)
            gl.uniform1f(pointSizeLoc, pointSize)
        }
        this.incPointSize(0) // init pointSize uniform
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

        gl.drawArrays(gl.POINTS, 0, this.numVertex)
    }

    drop (gl: GlContext): void {
        this.minerals.drop(gl)
        this.program.drop(gl)
        this.spiralPosBuffer.drop(gl)
        this.columnPosBuffer.drop(gl)
        this.texCoordBuffer.drop(gl)
    }
}

const POINT_PER_ROW = 3

const addPunchcardAttrib = (
    out: Float32Array,
    offset: number,
    getPointAttrib: (i: number, j: number) => Array<number>,
    numRows: number,
    floatsPerVertex: number
): void => {
    const numVertex = POINT_PER_ROW * numRows

    let bufInd = 0
    const attribs = new Float32Array(numVertex * floatsPerVertex)
    for (let i = 0; i < numRows; i++) {
        for (let j = 0; j < POINT_PER_ROW; j++) {
            const attrib = getPointAttrib(i, j)
            attribs.set(attrib, bufInd)
            bufInd += floatsPerVertex
        }
    }
    out.set(attribs, offset)
}

const addPunchcardTexCoords = (
    out: Float32Array,
    offset: number,
    rect: TileRect,
    numRows: number
): void => {
    const heightInc = rect.height / numRows
    const widthInc = rect.width / POINT_PER_ROW

    const getPointCoords = (i: number, j: number): Array<number> => {
        return [
            rect.left + widthInc * j,
            rect.top + heightInc * i
        ]
    }
    addPunchcardAttrib(out, offset, getPointCoords, numRows, TEX_FPV)
}

const addPunchcardSpiralPositions = (
    out: Float32Array,
    offset: number,
    currRadius: number,
    currAngle: number,
    tileRadius: number,
    tileAngle: number,
    tileWidth: number,
    numRows: number
): void => {
    const angleInc = tileAngle / numRows
    const radiusInc = tileRadius / numRows

    const startRadius = currRadius - tileWidth * 0.5
    const startAngle = currAngle + angleInc * 0.5

    const getSpiralPointPositions = (i: number, j: number): Array<number> => {
        const angle = startAngle + angleInc * i
        const tileAcross = tileWidth * (j + 0.5) / POINT_PER_ROW
        const radius = startRadius + i * radiusInc + (tileWidth - tileAcross)
        return [
            Math.cos(angle) * radius,
            Math.sin(angle) * radius
        ]
    }

    addPunchcardAttrib(out, offset, getSpiralPointPositions, numRows, POS_FPV)
}

const addPunchcardColumnPositions = (
    out: Float32Array,
    offset: number,
    currColumnX: number,
    currColumnY: number,
    tileHeight: number,
    tileWidth: number,
    numRows: number
): void => {
    const columnYInc = -1 * tileHeight / numRows

    const startColumnY = currColumnY + columnYInc * 0.5

    const getPointPositions = (i: number, j: number): Array<number> => {
        const tileAcross = tileWidth * (j + 0.5) / POINT_PER_ROW
        const columnY = startColumnY + columnYInc * i
        const columnX = currColumnX + tileAcross
        return [columnX, columnY]
    }

    addPunchcardAttrib(out, offset, getPointPositions, numRows, POS_FPV)
}

export default PunchcardCoreRenderer
export {
    addPunchcardSpiralPositions,
    addPunchcardColumnPositions,
    addPunchcardTexCoords,
    POINT_PER_ROW
}

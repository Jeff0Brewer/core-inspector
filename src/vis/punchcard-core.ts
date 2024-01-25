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
    getRowAttrib: (i: number) => Float32Array,
    numRows: number,
    floatsPerVertex: number
): void => {
    const numVertex = POINT_PER_ROW * numRows

    let bufInd = 0
    const attribs = new Float32Array(numVertex * floatsPerVertex)
    for (let i = 0; i < numRows; i++) {
        const attrib = getRowAttrib(i)
        attribs.set(attrib, bufInd)
        bufInd += attrib.length
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

    const buffer = new Float32Array(6)

    const getRowCoords = (i: number): Float32Array => {
        const yCoord = rect.top + heightInc * i

        buffer[0] = rect.left
        buffer[1] = yCoord
        buffer[2] = rect.left + widthInc
        buffer[3] = yCoord
        buffer[4] = rect.left + 2 * widthInc
        buffer[5] = yCoord
        return buffer
    }
    addPunchcardAttrib(out, offset, getRowCoords, numRows, TEX_FPV)
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
    const acrossInc = tileWidth / POINT_PER_ROW

    const startRadius = currRadius - tileWidth * 0.5 + acrossInc * 0.5

    const buffer = new Float32Array(6)

    const getRowPositions = (i: number): Float32Array => {
        const radius = startRadius + radiusInc * i
        const angle = currAngle + angleInc * (i + 0.5)
        const sin = Math.sin(angle)
        const cos = Math.cos(angle)

        buffer[0] = cos * radius
        buffer[1] = sin * radius
        buffer[2] = cos * (radius + acrossInc)
        buffer[3] = sin * (radius + acrossInc)
        buffer[4] = cos * (radius + 2 * acrossInc)
        buffer[5] = sin * (radius + 2 * acrossInc)
        return buffer
    }

    addPunchcardAttrib(out, offset, getRowPositions, numRows, POS_FPV)
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
    const columnXInc = tileWidth / POINT_PER_ROW

    const buffer = new Float32Array(6)

    const getRowPositions = (i: number): Float32Array => {
        const columnY = currColumnY + columnYInc * (i + 0.5)
        const columnX = currColumnX + columnXInc * 0.5

        buffer[0] = columnX
        buffer[1] = columnY
        buffer[2] = columnX + columnXInc
        buffer[3] = columnY
        buffer[4] = columnX + 2 * columnXInc
        buffer[5] = columnY
        return buffer
    }

    addPunchcardAttrib(out, offset, getRowPositions, numRows, POS_FPV)
}

export default PunchcardCoreRenderer
export {
    addPunchcardSpiralPositions,
    addPunchcardColumnPositions,
    addPunchcardTexCoords,
    POINT_PER_ROW
}

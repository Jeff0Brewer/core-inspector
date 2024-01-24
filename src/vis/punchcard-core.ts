import { mat4 } from 'gl-matrix'
import { initProgram, initBuffer, initAttribute } from '../lib/gl-wrap'
import { POS_FPV, TEX_FPV, CoreShape } from '../vis/core'
import { TileRect } from '../lib/tile-texture'
import MineralBlender from '../vis/mineral-blend'
import vertSource from '../shaders/punchcard-vert.glsl?raw'
import fragSource from '../shaders/punchcard-frag.glsl?raw'

class PunchcardCoreRenderer {
    minerals: MineralBlender
    program: WebGLProgram
    spiralPosBuffer: WebGLBuffer
    columnPosBuffer: WebGLBuffer
    texBuffer: WebGLBuffer
    bindSpiralPos: () => void
    bindColumnPos: () => void
    bindTexCoords: () => void
    setProj: (m: mat4) => void
    setView: (m: mat4) => void
    setShapeT: (t: number) => void
    setDpr: (r: number) => void
    incPointSize: (d: number) => void
    numVertex: number

    constructor (
        gl: WebGLRenderingContext,
        minerals: MineralBlender,
        positions: Float32Array,
        texCoords: Float32Array,
        pointSize: number,
        shape: CoreShape
    ) {
        this.minerals = minerals

        this.program = initProgram(gl, vertSource, fragSource)

        this.texBuffer = initBuffer(gl)
        gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW)
        this.numVertex = texCoords.length / TEX_FPV

        this.spiralPosBuffer = initBuffer(gl)
        gl.bufferData(
            gl.ARRAY_BUFFER,
            shape === 'spiral' ? positions : new Float32Array(positions.length),
            gl.STATIC_DRAW
        )

        this.columnPosBuffer = initBuffer(gl)
        gl.bufferData(
            gl.ARRAY_BUFFER,
            shape === 'column' ? positions : new Float32Array(positions.length),
            gl.STATIC_DRAW
        )

        this.bindSpiralPos = initAttribute(gl, this.program, 'spiralPos', POS_FPV, POS_FPV, 0)
        this.bindColumnPos = initAttribute(gl, this.program, 'columnPos', POS_FPV, POS_FPV, 0)
        this.bindTexCoords = initAttribute(gl, this.program, 'texCoord', TEX_FPV, TEX_FPV, 0)

        const projLoc = gl.getUniformLocation(this.program, 'proj')
        const viewLoc = gl.getUniformLocation(this.program, 'view')
        const shapeTLoc = gl.getUniformLocation(this.program, 'shapeT')
        const dprLoc = gl.getUniformLocation(this.program, 'dpr')
        this.setProj = (m: mat4): void => { gl.uniformMatrix4fv(projLoc, false, m) }
        this.setView = (m: mat4): void => { gl.uniformMatrix4fv(viewLoc, false, m) }
        this.setShapeT = (t: number): void => { gl.uniform1f(shapeTLoc, t) }
        this.setDpr = (r: number): void => { gl.uniform1f(dprLoc, r) }

        const pointSizeLoc = gl.getUniformLocation(this.program, 'pointSize')
        this.incPointSize = (delta: number): void => {
            pointSize = Math.max(1, pointSize + delta)
            gl.useProgram(this.program)
            gl.uniform1f(pointSizeLoc, pointSize)
        }
        this.incPointSize(0) // init pointSize uniform
    }

    // generate vertices externally to coordinate alignment between
    // punchcard and downscaled representations
    setPositions (
        gl: WebGLRenderingContext,
        positions: Float32Array,
        shape: CoreShape
    ): void {
        const newNumVertex = positions.length / POS_FPV
        if (newNumVertex !== this.numVertex) {
            throw new Error('Incorrect number of new position vertices')
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, shape === 'spiral'
            ? this.spiralPosBuffer
            : this.columnPosBuffer
        )
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)
    }

    draw (
        gl: WebGLRenderingContext,
        view: mat4,
        shapeT: number
    ): void {
        gl.useProgram(this.program)

        this.minerals.bind(gl)
        gl.bindBuffer(gl.ARRAY_BUFFER, this.spiralPosBuffer)
        this.bindSpiralPos()
        gl.bindBuffer(gl.ARRAY_BUFFER, this.columnPosBuffer)
        this.bindColumnPos()
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texBuffer)
        this.bindTexCoords()

        this.setView(view)
        this.setShapeT(shapeT)

        gl.drawArrays(gl.POINTS, 0, this.numVertex)
    }
}

const POINT_PER_ROW = 3

const addPunchcardAttrib = (
    out: Float32Array,
    offset: number,
    getPointAttrib: (i: number, j: number) => Array<number>,
    numRows: number
): void => {
    const attribs = []
    for (let i = 0; i < numRows; i++) {
        for (let j = 0; j < POINT_PER_ROW; j++) {
            attribs.push(...getPointAttrib(i, j))
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
    addPunchcardAttrib(out, offset, getPointCoords, numRows)
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

    addPunchcardAttrib(out, offset, getSpiralPointPositions, numRows)
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

    addPunchcardAttrib(out, offset, getPointPositions, numRows)
}

export default PunchcardCoreRenderer
export {
    addPunchcardSpiralPositions,
    addPunchcardColumnPositions,
    addPunchcardTexCoords,
    POINT_PER_ROW
}

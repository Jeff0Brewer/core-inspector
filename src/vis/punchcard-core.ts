import { mat4 } from 'gl-matrix'
import { initProgram, initBuffer, initAttribute } from '../lib/gl-wrap'
import { POS_FPV, TEX_FPV, POS_STRIDE, TEX_STRIDE } from '../vis/core'
import { TileRect } from '../lib/tile-texture'
import MineralBlender from '../vis/mineral-blend'
import vertSource from '../shaders/punchcard-vert.glsl?raw'
import fragSource from '../shaders/punchcard-frag.glsl?raw'

class PunchcardCoreRenderer {
    minerals: MineralBlender
    program: WebGLProgram
    posBuffer: WebGLBuffer
    texBuffer: WebGLBuffer
    bindPositions: () => void
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
        pointSize: number
    ) {
        this.minerals = minerals

        this.program = initProgram(gl, vertSource, fragSource)

        this.numVertex = positions.length / POS_STRIDE
        this.posBuffer = initBuffer(gl)
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)
        this.texBuffer = initBuffer(gl)
        gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW)

        const bindSpiralPos = initAttribute(gl, this.program, 'spiralPos', POS_FPV, POS_STRIDE, 0)
        const bindColumnPos = initAttribute(gl, this.program, 'columnPos', POS_FPV, POS_STRIDE, POS_FPV)
        this.bindPositions = (): void => {
            bindSpiralPos()
            bindColumnPos()
        }
        this.bindTexCoords = initAttribute(gl, this.program, 'texCoord', TEX_FPV, TEX_STRIDE, 0)

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
    setPositions (gl: WebGLRenderingContext, positions: Float32Array): void {
        const newNumVertex = positions.length / POS_STRIDE
        if (newNumVertex !== this.numVertex) {
            throw new Error('Incorrect number of new position vertices')
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)
    }

    draw (
        gl: WebGLRenderingContext,
        view: mat4,
        mineralIndex: number,
        shapeT: number
    ): void {
        gl.useProgram(this.program)

        gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer)
        this.bindPositions()
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texBuffer)
        this.bindTexCoords()

        this.setView(view)
        this.setShapeT(shapeT)

        this.minerals.bind(gl, mineralIndex)

        gl.drawArrays(gl.POINTS, 0, this.numVertex)
    }
}

const POINT_PER_ROW = 3

const addPunchcardAttrib = (
    out: Array<number>,
    getPointAttrib: (i: number, j: number) => Array<number>,
    numRows: number
): void => {
    for (let i = 0; i < numRows; i++) {
        for (let j = 0; j < POINT_PER_ROW; j++) {
            out.push(...getPointAttrib(i, j))
        }
    }
}

const addPunchcardTexCoords = (
    out: Array<number>,
    rect: TileRect,
    textureHeight: number
): void => {
    const numRows = Math.round(rect.height * textureHeight)
    const heightInc = rect.height / numRows
    const widthInc = rect.width / POINT_PER_ROW

    const getPointCoords = (i: number, j: number): Array<number> => {
        return [
            rect.left + widthInc * j,
            rect.top + heightInc * i
        ]
    }
    addPunchcardAttrib(out, getPointCoords, numRows)
}

const addPunchcardPositions = (
    out: Array<number>,
    rect: TileRect,
    currRadius: number,
    currAngle: number,
    currColX: number,
    currColY: number,
    tileRadius: number,
    tileAngle: number,
    tileHeight: number,
    bandWidth: number,
    textureHeight: number
): void => {
    const numRows = Math.round(rect.height * textureHeight)
    const angleInc = tileAngle / numRows
    const radiusInc = tileRadius / numRows
    const colYInc = -1 * tileHeight / numRows

    const startRadius = currRadius - bandWidth * 0.5
    const startAngle = currAngle + angleInc * 0.5
    const startColY = currColY + colYInc * 0.5

    const getPointPositions = (i: number, j: number): Array<number> => {
        const angle = startAngle + angleInc * i
        const bandAcross = bandWidth - (bandWidth * (j + 0.5) / POINT_PER_ROW)
        const radius = startRadius + i * radiusInc + bandAcross
        const colY = startColY + colYInc * i
        const colX = currColX + bandAcross
        return [
            Math.cos(angle) * radius,
            Math.sin(angle) * radius,
            colX,
            colY
        ]
    }

    addPunchcardAttrib(out, getPointPositions, numRows)
}

export default PunchcardCoreRenderer
export {
    addPunchcardPositions,
    addPunchcardTexCoords
}

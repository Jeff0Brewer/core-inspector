import { mat4 } from 'gl-matrix'
import { GlContext, GlProgram, GlBuffer } from '../lib/gl-wrap'
import { CoreShape } from '../vis/core'
import { POS_FPV, TEX_FPV } from '../lib/vert-gen'
import MineralBlender from '../vis/mineral-blend'
import vertSource from '../shaders/punchcard-vert.glsl?raw'
import fragSource from '../shaders/punchcard-frag.glsl?raw'

class PunchcardCoreRenderer {
    program: GlProgram
    spiralPosBuffer: GlBuffer
    columnPosBuffer: GlBuffer
    texCoordBuffer: GlBuffer
    setProj: (m: mat4) => void
    setView: (m: mat4) => void
    setShapeT: (t: number) => void
    incPointSize: (d: number) => void
    setWindowHeight: (h: number) => void
    numVertex: number

    constructor (
        gl: GlContext,
        positions: Float32Array,
        texCoords: Float32Array,
        currentShape: CoreShape
    ) {
        this.numVertex = positions.length / POS_FPV

        this.program = new GlProgram(gl, vertSource, fragSource)

        // positions for only one core shape passed to constructor,
        // must fill other shape with empty buffer
        const emptyBuffer = new Float32Array(positions.length)

        this.spiralPosBuffer = new GlBuffer(gl)
        this.spiralPosBuffer.setData(gl, currentShape === 'spiral' ? positions : emptyBuffer)
        this.spiralPosBuffer.addAttribute(gl, this.program, 'spiralPos', POS_FPV, POS_FPV, 0)

        this.columnPosBuffer = new GlBuffer(gl)
        this.columnPosBuffer.setData(gl, currentShape === 'column' ? positions : emptyBuffer)
        this.columnPosBuffer.addAttribute(gl, this.program, 'columnPos', POS_FPV, POS_FPV, 0)

        this.texCoordBuffer = new GlBuffer(gl)
        this.texCoordBuffer.setData(gl, texCoords)
        this.texCoordBuffer.addAttribute(gl, this.program, 'texCoord', TEX_FPV, TEX_FPV, 0)

        const projLoc = this.program.getUniformLocation(gl, 'proj')
        const viewLoc = this.program.getUniformLocation(gl, 'view')
        const shapeTLoc = this.program.getUniformLocation(gl, 'shapeT')
        const windowHeightLoc = this.program.getUniformLocation(gl, 'windowHeight')
        this.setProj = (m: mat4): void => {
            this.program.bind(gl)
            gl.uniformMatrix4fv(projLoc, false, m)
        }
        this.setView = (m: mat4): void => { gl.uniformMatrix4fv(viewLoc, false, m) }
        this.setShapeT = (t: number): void => { gl.uniform1f(shapeTLoc, t) }
        this.setWindowHeight = (h: number): void => {
            this.program.bind(gl)
            gl.uniform1f(windowHeightLoc, h)
        }

        // temporary point size adjustment
        let pointSize = 3.5
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
    setPositions (gl: GlContext, positions: Float32Array, currentShape: CoreShape): void {
        if (currentShape === 'spiral') {
            this.spiralPosBuffer.setData(gl, positions)
        } else {
            this.columnPosBuffer.setData(gl, positions)
        }

        // if number of vertices has increased (due to calibration being shown)
        // fill non-visible shape with empty buffer
        const lastNumVertex = this.numVertex
        this.numVertex = positions.length / POS_FPV
        if (lastNumVertex < this.numVertex) {
            const emptyBuffer = new Float32Array(positions.length)
            if (currentShape === 'column') {
                this.spiralPosBuffer.setData(gl, emptyBuffer)
            } else {
                this.columnPosBuffer.setData(gl, emptyBuffer)
            }
        }
    }

    draw (gl: GlContext, minerals: MineralBlender, view: mat4, shapeT: number): void {
        this.program.bind(gl)

        this.spiralPosBuffer.bind(gl)
        this.columnPosBuffer.bind(gl)
        this.texCoordBuffer.bind(gl)
        minerals.bindTexture(gl)
        this.setView(view)
        this.setShapeT(shapeT)

        gl.drawArrays(gl.POINTS, 0, this.numVertex)
    }

    drop (gl: GlContext): void {
        this.program.drop(gl)
        this.spiralPosBuffer.drop(gl)
        this.columnPosBuffer.drop(gl)
        this.texCoordBuffer.drop(gl)
    }
}

export default PunchcardCoreRenderer

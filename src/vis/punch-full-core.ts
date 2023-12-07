import { mat4 } from 'gl-matrix'
import { initProgram, initBuffer, initAttribute } from '../lib/gl-wrap'
import { ease } from '../lib/util'
import { TileRect } from '../lib/tile-texture'
import TextureBlender from '../lib/texture-blend'
import punchVert from '../shaders/punchcard-vert.glsl?raw'
import punchFrag from '../shaders/punchcard-frag.glsl?raw'

const POS_FPV = 2
const TEX_FPV = 2
const STRIDE = POS_FPV + POS_FPV + TEX_FPV

class PunchcardCoreRenderer {
    program: WebGLProgram
    buffer: WebGLBuffer
    numVertex: number
    pointSize: number
    textureBlender: TextureBlender
    bindAttrib: () => void
    setProj: (m: mat4) => void
    setView: (m: mat4) => void
    setShapeT: (t: number) => void
    setDpr: (r: number) => void
    setPointSize: (s: number) => void

    constructor (
        gl: WebGLRenderingContext,
        mineralMaps: Array<HTMLImageElement>,
        vertices: Float32Array
    ) {
        this.program = initProgram(gl, punchVert, punchFrag)

        this.numVertex = vertices.length / STRIDE
        this.buffer = initBuffer(gl)
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)

        this.textureBlender = new TextureBlender(gl, mineralMaps)
        this.textureBlender.update(gl, Array(mineralMaps.length).fill(1))

        const bindSpiralPos = initAttribute(gl, this.program, 'spiralPos', POS_FPV, STRIDE, 0)
        const bindColumnPos = initAttribute(gl, this.program, 'columnPos', POS_FPV, STRIDE, POS_FPV)
        const bindTexCoord = initAttribute(gl, this.program, 'texCoord', TEX_FPV, STRIDE, 2 * POS_FPV)
        this.bindAttrib = (): void => {
            bindSpiralPos()
            bindColumnPos()
            bindTexCoord()
        }

        const projLoc = gl.getUniformLocation(this.program, 'proj')
        this.setProj = (m: mat4): void => { gl.uniformMatrix4fv(projLoc, false, m) }

        const viewLoc = gl.getUniformLocation(this.program, 'view')
        this.setView = (m: mat4): void => { gl.uniformMatrix4fv(viewLoc, false, m) }

        const shapeTLoc = gl.getUniformLocation(this.program, 'shapeT')
        this.setShapeT = (t: number): void => { gl.uniform1f(shapeTLoc, t) }

        const dprLoc = gl.getUniformLocation(this.program, 'dpr')
        this.setDpr = (r: number): void => { gl.uniform1f(dprLoc, r) }

        const pointSizeLoc = gl.getUniformLocation(this.program, 'pointSize')
        this.setPointSize = (s: number): void => {
            gl.useProgram(this.program)
            gl.uniform1f(pointSizeLoc, s)
        }
        this.pointSize = 2
        this.setPointSize(this.pointSize)
    }

    incPointSize (delta: number): void {
        this.pointSize = Math.max(1, this.pointSize + delta)
        this.setPointSize(this.pointSize)
    }

    setVerts (gl: WebGLRenderingContext, vertices: Float32Array): void {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer)
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)
        this.numVertex = vertices.length / STRIDE
    }

    draw (gl: WebGLRenderingContext, currMineral: number, shapeT: number): void {
        gl.useProgram(this.program)

        if (currMineral < 0) {
            this.textureBlender.bindBlended(gl)
        } else {
            this.textureBlender.bindSource(gl, currMineral)
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer)
        this.bindAttrib()
        this.setShapeT(ease(shapeT))

        gl.drawArrays(gl.POINTS, 0, this.numVertex)
    }
}

const addPunchTile = (
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
    const colYInc = tileHeight / numRows

    const colX = currColX
    let colY = currColY

    let radius = currRadius
    let angle = currAngle
    for (let i = 0; i < numRows; i++, radius += radiusInc, angle += angleInc, colY -= colYInc) {
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)
        const startRadius = radius - bandWidth * 0.5
        for (let p = 0; p < 3; p++) {
            const bandAcross = bandWidth * (p + 0.5) / 3
            out.push(
                cos * (startRadius + bandAcross),
                sin * (startRadius + bandAcross),
                colX + bandAcross,
                colY,
                rect.left + rect.width * p / 3,
                rect.top + rect.height * i / numRows
            )
        }
    }
}

export default PunchcardCoreRenderer
export { addPunchTile }

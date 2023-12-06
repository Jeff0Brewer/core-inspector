import { mat4 } from 'gl-matrix'
import { initProgram, initBuffer, initAttribute, initTexture } from '../lib/gl-wrap'
import { ease } from '../lib/util'
import { TileRect } from '../lib/tile-texture'
import punchVert from '../shaders/punchcard-vert.glsl?raw'
import punchFrag from '../shaders/punchcard-frag.glsl?raw'

const POS_FPV = 2
const TEX_FPV = 2
const STRIDE = POS_FPV + POS_FPV + TEX_FPV

class PunchcardCoreRenderer {
    program: WebGLProgram
    buffer: WebGLBuffer
    numVertex: number
    minerals: Array<WebGLTexture>
    bindAttrib: () => void
    setProj: (m: mat4) => void
    setView: (m: mat4) => void
    setShapeT: (t: number) => void

    constructor (
        gl: WebGLRenderingContext,
        mineralMaps: Array<HTMLImageElement>,
        vertices: Float32Array
    ) {
        this.program = initProgram(gl, punchVert, punchFrag)

        this.numVertex = vertices.length / STRIDE
        this.buffer = initBuffer(gl)
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)

        this.minerals = []
        for (const img of mineralMaps) {
            const texture = initTexture(gl)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, gl.LUMINANCE, gl.UNSIGNED_BYTE, img)
            this.minerals.push(texture)
        }

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
    }

    draw (gl: WebGLRenderingContext, currMineral: number, shapeT: number): void {
        gl.useProgram(this.program)

        gl.bindTexture(gl.TEXTURE_2D, this.minerals[currMineral])
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

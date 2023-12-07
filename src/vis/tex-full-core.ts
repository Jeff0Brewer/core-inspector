import { mat4 } from 'gl-matrix'
import { initProgram, initBuffer, initAttribute } from '../lib/gl-wrap'
import { ease } from '../lib/util'
import { TileRect } from '../lib/tile-texture'
import TextureBlender from '../lib/texture-blend'
import texVert from '../shaders/full-core-vert.glsl?raw'
import texFrag from '../shaders/full-core-frag.glsl?raw'

const POS_FPV = 2
const TEX_FPV = 2
const STRIDE = POS_FPV + POS_FPV + TEX_FPV

const TILE_DETAIL = 8

class TexMappedCoreRenderer {
    program: WebGLProgram
    buffer: WebGLBuffer
    textureBlender: TextureBlender
    numVertex: number
    bindAttrib: () => void
    setProj: (m: mat4) => void
    setView: (m: mat4) => void
    setShapeT: (t: number) => void

    constructor (
        gl: WebGLRenderingContext,
        mineralMaps: Array<HTMLImageElement>,
        vertices: Float32Array
    ) {
        this.program = initProgram(gl, texVert, texFrag)

        this.numVertex = vertices.length / STRIDE
        this.buffer = initBuffer(gl)
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)

        this.textureBlender = new TextureBlender(gl, mineralMaps)
        this.textureBlender.update(gl)

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

    setVerts (gl: WebGLRenderingContext, vertices: Float32Array): void {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer)
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)
        this.numVertex = vertices.length / STRIDE
    }

    draw (gl: WebGLRenderingContext, shapeT: number): void {
        gl.useProgram(this.program)

        this.textureBlender.bindTexture(gl)
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer)
        this.bindAttrib()
        this.setShapeT(ease(shapeT))

        gl.drawArrays(gl.TRIANGLES, 0, this.numVertex)
    }
}

const addTexTile = (
    out: Array<number>,
    rect: TileRect,
    currRadius: number,
    currAngle: number,
    currColX: number,
    currColY: number,
    tileRadius: number,
    tileAngle: number,
    tileHeight: number,
    bandWidth: number
): void => {
    const angleInc = tileAngle / TILE_DETAIL
    const radiusInc = tileRadius / TILE_DETAIL
    const yInc = rect.height / TILE_DETAIL
    const colYInc = tileHeight / TILE_DETAIL

    let angle = currAngle
    let radius = currRadius
    const colX = currColX
    let colY = currColY

    let i = 0
    while (i < TILE_DETAIL) {
        const inner = [
            Math.cos(angle) * (radius - bandWidth * 0.5),
            Math.sin(angle) * (radius - bandWidth * 0.5),
            colX,
            colY,
            rect.left,
            rect.top + yInc * i
        ]

        const outer = [
            Math.cos(angle) * (radius + bandWidth * 0.5),
            Math.sin(angle) * (radius + bandWidth * 0.5),
            colX + bandWidth,
            colY,
            rect.left + rect.width,
            rect.top + yInc * i
        ]

        i += 1
        radius += radiusInc
        angle += angleInc
        colY -= colYInc

        const nextInner = [
            Math.cos(angle) * (radius - bandWidth * 0.5),
            Math.sin(angle) * (radius - bandWidth * 0.5),
            colX,
            colY,
            rect.left,
            rect.top + yInc * i
        ]

        const nextOuter = [
            Math.cos(angle) * (radius + bandWidth * 0.5),
            Math.sin(angle) * (radius + bandWidth * 0.5),
            colX + bandWidth,
            colY,
            rect.left + rect.width,
            rect.top + yInc * i
        ]

        out.push(
            ...inner,
            ...outer,
            ...nextOuter,
            ...nextOuter,
            ...nextInner,
            ...inner
        )
    }
}

export default TexMappedCoreRenderer
export { addTexTile }

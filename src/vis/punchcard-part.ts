import { GlContext, GlProgram, GlBuffer, GlTextureFramebuffer } from '../lib/gl-wrap'
import { TileTextureMetadata } from '../lib/tile-texture'
import { POS_FPV, TEX_FPV } from '../lib/vert-gen'
import { CanvasCtx, glToCanvas } from '../vis/part'
import MineralBlender from '../vis/mineral-blend'
import vertSource from '../shaders/punchcard-part-vert.glsl?raw'
import fragSource from '../shaders/punchcard-part-frag.glsl?raw'

const STRIDE = POS_FPV + TEX_FPV

class PunchcardPartRenderer {
    metadata: TileTextureMetadata
    program: GlProgram
    buffer: GlBuffer
    setPointSize: (s: number) => void

    constructor (
        gl: GlContext,
        metadata: TileTextureMetadata
    ) {
        this.metadata = metadata

        this.program = new GlProgram(gl, vertSource, fragSource)

        this.buffer = new GlBuffer(gl)
        this.buffer.addAttribute(gl, this.program, 'position', POS_FPV, STRIDE, 0)
        this.buffer.addAttribute(gl, this.program, 'texCoord', TEX_FPV, STRIDE, POS_FPV)

        const pointSizeLoc = this.program.getUniformLocation(gl, 'pointSize')
        this.setPointSize = (s: number): void => { gl.uniform1f(pointSizeLoc, s) }
    }

    getPunchcard (
        gl: GlContext,
        part: string,
        minerals: MineralBlender,
        output: CanvasCtx
    ): number {
        const tile = this.metadata.tiles[part]

        // temp
        const pointPerRow = 3
        const numRows = Math.round(pointPerRow * (2 * tile.height / tile.width))
        const width = 100
        const height = 2 * Math.round(width * tile.height / tile.width)

        output.canvas.width = width
        output.canvas.height = height

        const framebuffer = new GlTextureFramebuffer(gl, width, height)

        const verts = []

        const xInc = 2 / pointPerRow
        const yInc = 2 / numRows
        const xStart = -1 + xInc * 0.5
        const yStart = -1 + yInc * 0.5

        const txInc = tile.width / pointPerRow
        const tyInc = tile.height / numRows
        const txStart = tile.left + txInc * 0.5
        const tyStart = tile.top + tyInc * 0.5

        for (let i = 0; i < numRows; i++) {
            for (let j = 0; j < pointPerRow; j++) {
                verts.push(
                    xStart + xInc * j,
                    yStart + yInc * i,
                    txStart + txInc * j,
                    tyStart + tyInc * i
                )
            }
        }

        const numVertex = verts.length / STRIDE
        this.buffer.setData(gl, new Float32Array(verts))

        framebuffer.bind(gl)
        this.program.bind(gl)
        this.buffer.bind(gl)
        minerals.bindTexture(gl)

        this.setPointSize(width / pointPerRow)

        gl.viewport(0, 0, width, height)
        gl.drawArrays(gl.POINTS, 0, numVertex)

        glToCanvas(gl, framebuffer, output.ctx, width, height)

        return height / width
    }
}

export default PunchcardPartRenderer

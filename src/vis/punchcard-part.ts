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

    constructor (
        gl: GlContext,
        metadata: TileTextureMetadata
    ) {
        this.metadata = metadata

        this.program = new GlProgram(gl, vertSource, fragSource)

        this.buffer = new GlBuffer(gl)
        this.buffer.addAttribute(gl, this.program, 'position', POS_FPV, STRIDE, 0)
        this.buffer.addAttribute(gl, this.program, 'texCoord', TEX_FPV, STRIDE, POS_FPV)
    }

    getPunchcard (
        gl: GlContext,
        part: string,
        minerals: MineralBlender,
        output: CanvasCtx
    ): void {
        const tile = this.metadata.tiles[part]

        // temp
        const pointPerRow = 3
        const numRows = Math.round(pointPerRow * (2 * tile.height / tile.width))
        const width = 100
        const height = width * tile.width / tile.height

        output.canvas.width = width
        output.canvas.height = height

        const framebuffer = new GlTextureFramebuffer(gl, width, height)

        const verts = []

        const xInc = 1 / pointPerRow
        const yInc = 1 / numRows
        const xStart = xInc * 0.5
        const yStart = yInc * 0.5

        const txInc = 1 / tile.width
        const tyInc = 1 / tile.height
        const txStart = txInc * 0.5
        const tyStart = tyInc * 0.5

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

        gl.drawArrays(gl.POINTS, 0, numVertex)

        glToCanvas(gl, framebuffer, output.ctx, width, height)
    }
}

export default PunchcardPartRenderer

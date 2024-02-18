import { initGl, GlContext, GlBuffer, GlProgram, GlTextureFramebuffer } from '../lib/gl-wrap'
import { TileTextureMetadata } from '../lib/tile-texture'
import MineralBlender, { BlendParams } from '../vis/mineral-blend'
import PunchcardPartRenderer from '../vis/punchcard-part'
import { POS_FPV, TEX_FPV } from '../lib/vert-gen'
import vertSource from '../shaders/single-part-vert.glsl?raw'
import fragSource from '../shaders/single-part-frag.glsl?raw'

const STRIDE = POS_FPV + TEX_FPV

type CanvasCtx = {
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D
}

class PartRenderer {
    canvas: HTMLCanvasElement
    gl: GlContext
    program: GlProgram
    buffer: GlBuffer
    numVertex: number
    partMinerals: MineralBlender
    coreMinerals: MineralBlender
    punchcardPart: PunchcardPartRenderer
    tileMetadata: TileTextureMetadata
    dropped: boolean

    constructor (
        minerals: Array<string>,
        partMinerals: Array<HTMLImageElement>,
        coreMinerals: Array<HTMLImageElement>,
        metadata: TileTextureMetadata
    ) {
        this.tileMetadata = metadata

        this.canvas = document.createElement('canvas')
        this.canvas.width = partMinerals[0].width
        this.canvas.height = partMinerals[0].height

        this.gl = initGl(this.canvas)
        this.gl.enable(this.gl.BLEND)
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA)

        this.program = new GlProgram(this.gl, vertSource, fragSource)
        this.buffer = new GlBuffer(this.gl)
        this.buffer.setData(
            this.gl,
            new Float32Array([
                -1, -1, 0, 0,
                1, -1, 1, 0,
                -1, 1, 0, 1,
                1, 1, 1, 1
            ])
        )
        this.numVertex = 4
        this.buffer.addAttribute(this.gl, this.program, 'position', POS_FPV, STRIDE, 0)
        this.buffer.addAttribute(this.gl, this.program, 'texCoord', TEX_FPV, STRIDE, POS_FPV)

        this.partMinerals = new MineralBlender(this.gl, partMinerals, minerals)
        this.coreMinerals = new MineralBlender(this.gl, coreMinerals, minerals)

        this.punchcardPart = new PunchcardPartRenderer(this.gl)

        this.dropped = false
    }

    setBlending (params: BlendParams): void {
        if (this.dropped) { return }

        this.coreMinerals.update(this.gl, params)

        this.partMinerals.update(this.gl, params)
        this.partMinerals.bindTexture(this.gl)

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null)
        this.program.bind(this.gl)
        this.buffer.bind(this.gl)

        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height)
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, this.numVertex)
    }

    getPunchcard (part: string, output: CanvasCtx, width: number): number {
        if (this.dropped) { return 0 }
        return this.punchcardPart.getPunchcard(
            this.gl,
            this.tileMetadata,
            part,
            this.coreMinerals,
            output,
            width
        )
    }

    getPartAspects (parts: Array<string>): Array<number> {
        return parts.map(part => {
            const rect = this.tileMetadata.tiles[part]
            if (!rect) {
                throw new Error(`Part ${part} not present in metadata`)
            }
            const { width, height } = rect
            return width / (2 * height)
        })
    }

    drop (): void {
        this.partMinerals.drop(this.gl)
        this.coreMinerals.drop(this.gl)
        this.dropped = true
    }
}

function glToCanvas (
    gl: GlContext,
    framebuffer: GlTextureFramebuffer,
    canvasCtx: CanvasCtx
): void {
    const { canvas, ctx } = canvasCtx
    const { width, height } = canvas

    framebuffer.bind(gl)
    const pixels = new Uint8ClampedArray(4 * width * height)
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)

    const imageData = new ImageData(pixels, width, height)
    ctx.putImageData(imageData, 0, 0)
}

export default PartRenderer
export { glToCanvas }
export type { CanvasCtx }

import { initGl, GlContext, GlTextureFramebuffer } from '../lib/gl-wrap'
import { TileTextureMetadata } from '../lib/tile-texture'
import MineralBlender, { BlendParams } from '../vis/mineral-blend'
import PunchcardPartRenderer from '../vis/punchcard-part'

type CanvasCtx = {
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D
}

class PartRenderer {
    canvas: HTMLCanvasElement
    gl: GlContext
    partMinerals: MineralBlender
    coreMinerals: MineralBlender
    punchcardPart: PunchcardPartRenderer
    dropped: boolean

    constructor (
        minerals: Array<string>,
        partMinerals: Array<HTMLImageElement>,
        coreMinerals: Array<HTMLImageElement>,
        metadata: TileTextureMetadata
    ) {
        this.canvas = document.createElement('canvas')

        this.gl = initGl(this.canvas)
        this.gl.enable(this.gl.BLEND)
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA)

        this.partMinerals = new MineralBlender(this.gl, partMinerals, minerals)
        this.coreMinerals = new MineralBlender(this.gl, coreMinerals, minerals)

        this.punchcardPart = new PunchcardPartRenderer(this.gl, metadata)

        this.dropped = false
    }

    getBlended (params: BlendParams, output: CanvasCtx): void {
        if (this.dropped) { return }
        const { width, height } = output.canvas
        const ctx = output.ctx

        this.canvas.width = width
        this.canvas.height = height

        this.partMinerals.update(this.gl, params)
        this.partMinerals.bindFramebuffer(this.gl)

        glToCanvas(
            this.gl,
            this.partMinerals.framebuffer,
            ctx,
            width,
            height
        )
    }

    getPunchcard (part: string, params: BlendParams, output: CanvasCtx): void {
        if (this.dropped) { return }

        this.coreMinerals.update(this.gl, params)

        this.punchcardPart.getPunchcard(
            this.gl,
            part,
            this.coreMinerals,
            output
        )
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
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
): void {
    framebuffer.bind(gl)
    const pixels = new Uint8ClampedArray(4 * width * height)
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)

    const imageData = new ImageData(pixels, width, height)
    ctx.putImageData(imageData, 0, 0)
}

export default PartRenderer
export { glToCanvas }
export type { CanvasCtx }

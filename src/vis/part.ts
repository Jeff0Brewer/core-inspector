import { initGl, GlContext, GlTextureFramebuffer } from '../lib/gl-wrap'
import MineralBlender, { BlendParams } from '../vis/mineral-blend'

type CanvasCtx = {
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D
}

class PartRenderer {
    canvas: HTMLCanvasElement
    gl: GlContext
    mineralBlender: MineralBlender
    dropped: boolean

    constructor (
        minerals: Array<string>,
        mineralMaps: Array<HTMLImageElement>
    ) {
        this.canvas = document.createElement('canvas')

        this.gl = initGl(this.canvas)

        this.mineralBlender = new MineralBlender(this.gl, mineralMaps, minerals)

        this.dropped = false
    }

    getBlended (params: BlendParams, canvasCtx: CanvasCtx): void {
        if (this.dropped) { return }
        const { width, height } = canvasCtx.canvas
        const { ctx } = canvasCtx

        this.canvas.width = width
        this.canvas.height = height

        this.mineralBlender.update(this.gl, params)
        this.mineralBlender.bindFramebuffer(this.gl)

        this.copyToCanvas(
            this.mineralBlender.framebuffer,
            ctx,
            width,
            height
        )
    }

    copyToCanvas (
        framebuffer: GlTextureFramebuffer,
        ctx: CanvasRenderingContext2D,
        width: number,
        height: number
    ): void {
        framebuffer.bind(this.gl)
        const pixels = new Uint8ClampedArray(4 * width * height)
        this.gl.readPixels(0, 0, width, height, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixels)

        const imageData = new ImageData(pixels, width, height)
        ctx.putImageData(imageData, 0, 0)
    }

    drop (): void {
        this.mineralBlender.drop(this.gl)
        this.dropped = true
    }
}

export default PartRenderer
export type { CanvasCtx }

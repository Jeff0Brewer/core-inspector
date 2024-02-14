import { initGl, GlContext, GlProgram, GlBuffer, GlTextureFramebuffer } from '../lib/gl-wrap'
import MineralBlender, { BlendParams } from '../vis/mineral-blend'
import { POS_FPV, TEX_FPV, FULLSCREEN_RECT } from '../lib/vert-gen'
import vertSource from '../shaders/single-part-vert.glsl?raw'
import fragSource from '../shaders/single-part-frag.glsl?raw'

type CanvasContext = {
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D
}

const STRIDE = POS_FPV + TEX_FPV

class PartRenderer {
    canvas: HTMLCanvasElement
    blendOutput: CanvasContext
    gl: GlContext
    program: GlProgram
    buffer: GlBuffer
    mineralBlender: MineralBlender
    numVertex: number
    dropped: boolean

    constructor (
        minerals: Array<string>,
        mineralMaps: Array<HTMLImageElement>,
        blendOutput: CanvasContext
    ) {
        this.canvas = document.createElement('canvas')
        this.blendOutput = blendOutput

        this.gl = initGl(this.canvas)

        this.program = new GlProgram(this.gl, vertSource, fragSource)

        this.buffer = new GlBuffer(this.gl)
        this.buffer.setData(this.gl, new Float32Array([
            -1, -1, 0, 1,
            1, -1, 1, 1,
            -1, 1, 0, 0,
            1, 1, 1, 0
        ]))
        this.buffer.addAttribute(this.gl, this.program, 'position', POS_FPV, STRIDE, 0)
        this.buffer.addAttribute(this.gl, this.program, 'texCoord', TEX_FPV, STRIDE, POS_FPV)
        this.numVertex = FULLSCREEN_RECT.length / STRIDE

        this.mineralBlender = new MineralBlender(this.gl, mineralMaps, minerals)

        this.dropped = false
    }

    setBlending (params: BlendParams): void {
        if (this.dropped) { return }
        this.canvas.width = this.blendOutput.canvas.width
        this.canvas.height = this.blendOutput.canvas.height

        this.mineralBlender.update(this.gl, params)
        this.mineralBlender.bindFramebuffer(this.gl)

        this.copyToCanvas(this.mineralBlender.framebuffer, this.blendOutput)
    }

    copyToCanvas (
        framebuffer: GlTextureFramebuffer,
        canvasContext: CanvasContext
    ): void {
        framebuffer.bind(this.gl)
        const { canvas: { width, height }, ctx } = canvasContext

        const pixels = new Uint8ClampedArray(4 * width * height)
        this.gl.readPixels(0, 0, width, height, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixels)

        const imageData = new ImageData(pixels, width, height)
        ctx.putImageData(imageData, 0, 0)
    }

    drop (): void {
        this.mineralBlender.drop(this.gl)
        this.program.drop(this.gl)
        this.buffer.drop(this.gl)

        this.dropped = true
    }
}

export default PartRenderer

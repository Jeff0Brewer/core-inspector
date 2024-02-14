import { initGl, GlContext, GlProgram, GlBuffer } from '../lib/gl-wrap'
import MineralBlender, { BlendParams } from '../vis/mineral-blend'
import { POS_FPV, TEX_FPV, FULLSCREEN_RECT } from '../lib/vert-gen'
import vertSource from '../shaders/single-part-vert.glsl?raw'
import fragSource from '../shaders/single-part-frag.glsl?raw'

const STRIDE = POS_FPV + TEX_FPV

class PartRenderer {
    canvas: HTMLCanvasElement
    gl: GlContext
    program: GlProgram
    buffer: GlBuffer
    mineralBlender: MineralBlender
    numVertex: number
    dropped: boolean

    constructor (
        canvas: HTMLCanvasElement,
        minerals: Array<string>,
        mineralMaps: Array<HTMLImageElement>
    ) {
        this.canvas = canvas

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
        this.mineralBlender.update(this.gl, params)

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null)
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height)
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT)

        this.program.bind(this.gl)
        this.buffer.bind(this.gl)
        this.mineralBlender.bind(this.gl)

        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, this.numVertex)
    }

    drop (): void {
        this.mineralBlender.drop(this.gl)
        this.program.drop(this.gl)
        this.buffer.drop(this.gl)

        this.dropped = true
    }
}

export default PartRenderer

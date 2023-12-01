import { mat4 } from 'gl-matrix'
import { initGl } from '../lib/gl-wrap'

class VisRenderer {
    canvas: HTMLCanvasElement
    gl: WebGLRenderingContext
    view: mat4
    proj: mat4

    constructor (canvas: HTMLCanvasElement) {
        this.canvas = canvas
        this.gl = initGl(this.canvas)

        this.view = mat4.lookAt(
            mat4.create(),
            [0, 0, 1],
            [0, 0, 0],
            [0, 1, 0]
        )

        this.proj = mat4.create()
        this.resize() // init canvas size, gl viewport, proj matrix
    }

    resize (): void {
        const w = window.innerWidth * window.devicePixelRatio
        const h = window.innerHeight * window.devicePixelRatio

        this.canvas.width = w
        this.canvas.height = h

        this.gl.viewport(0, 0, w, h)

        mat4.perspective(this.proj, 0.5 * Math.PI, w / h, 0.01, 5)
    }

    draw (): void {
        this.gl.clear(this.gl.DEPTH_BUFFER_BIT || this.gl.COLOR_BUFFER_BIT)
    }
}

export default VisRenderer

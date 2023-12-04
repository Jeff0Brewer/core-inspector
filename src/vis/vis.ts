import { mat4 } from 'gl-matrix'
import { initGl } from '../lib/gl-wrap'
import { ColumnTextureMetadata } from '../lib/column-texture'
import FullCoreRenderer from '../vis/full-core'
import PunchcardRenderer from '../vis/punchcard'

class VisRenderer {
    canvas: HTMLCanvasElement
    gl: WebGLRenderingContext
    view: mat4
    proj: mat4
    fullCore: FullCoreRenderer
    punchcard: PunchcardRenderer

    constructor (
        canvas: HTMLCanvasElement,
        downscaledMaps: Array<HTMLImageElement>,
        downscaledMetadata: ColumnTextureMetadata,
        punchcardMaps: Array<HTMLImageElement>,
        punchcardMetadata: ColumnTextureMetadata
    ) {
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

        this.fullCore = new FullCoreRenderer(this.gl, downscaledMaps, downscaledMetadata)
        this.fullCore.setProj(this.proj)
        this.fullCore.setView(this.view)

        this.punchcard = new PunchcardRenderer(this.gl, punchcardMaps, punchcardMetadata)
        this.punchcard.setProj(this.proj)
        this.punchcard.setView(this.view)
    }

    resize (): void {
        const w = window.innerWidth * window.devicePixelRatio
        const h = window.innerHeight * window.devicePixelRatio

        this.canvas.width = w
        this.canvas.height = h

        this.gl.viewport(0, 0, w, h)

        mat4.perspective(this.proj, 0.5 * Math.PI, w / h, 0.01, 5)
    }

    draw (elapsed: number): void {
        this.gl.clear(this.gl.DEPTH_BUFFER_BIT || this.gl.COLOR_BUFFER_BIT)

        // this.fullCore.draw(this.gl, elapsed)
        this.punchcard.draw(this.gl, elapsed)
    }
}

export default VisRenderer

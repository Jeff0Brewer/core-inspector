import { mat4 } from 'gl-matrix'
import { initGl } from '../lib/gl-wrap'
import { TileTextureMetadata } from '../lib/tile-texture'
import FullCoreRenderer from '../vis/full-core'
import Camera2D from '../lib/camera'

class VisRenderer {
    canvas: HTMLCanvasElement
    gl: WebGLRenderingContext
    fullCore: FullCoreRenderer
    camera: Camera2D
    proj: mat4

    constructor (
        canvas: HTMLCanvasElement,
        downscaledMaps: Array<HTMLImageElement>,
        downscaledMetadata: TileTextureMetadata,
        punchcardMaps: Array<HTMLImageElement>,
        punchcardMetadata: TileTextureMetadata
    ) {
        this.canvas = canvas
        this.gl = initGl(this.canvas)

        this.fullCore = new FullCoreRenderer(
            this.gl,
            downscaledMaps,
            downscaledMetadata,
            punchcardMaps,
            punchcardMetadata
        )

        this.camera = new Camera2D([0, 0, 1], [0, 0, 0], [0, 1, 0])
        this.fullCore.setView(this.camera.matrix)

        this.proj = mat4.create()
        this.resize() // init canvas size, gl viewport, proj matrix
    }

    setupEventListeners (): (() => void) {
        let dragging = false
        const mousedown = (): void => { dragging = true }
        const mouseup = (): void => { dragging = false }
        const mouseleave = (): void => { dragging = false }
        const mousemove = (e: MouseEvent): void => {
            if (dragging) {
                this.camera.pan(e.movementX, e.movementY)
            }
        }

        window.addEventListener('mousedown', mousedown)
        window.addEventListener('mouseup', mouseup)
        window.addEventListener('mouseleave', mouseleave)
        window.addEventListener('mousemove', mousemove)
        return (): void => {
            window.removeEventListener('mousedown', mousedown)
            window.removeEventListener('mouseup', mouseup)
            window.removeEventListener('mouseleave', mouseleave)
            window.removeEventListener('mousemove', mousemove)
        }
    }

    setZoom (t: number): void {
        this.camera.setZoom(t)
    }

    setCurrMineral (i: number): void {
        this.fullCore.setCurrMineral(i)
    }

    setFullCoreSpacing (horizontal: number, vertical: number): void {
        this.fullCore.setSpacing(this.gl, horizontal, vertical)
    }

    resize (): void {
        const w = window.innerWidth * window.devicePixelRatio
        const h = window.innerHeight * window.devicePixelRatio

        this.canvas.width = w
        this.canvas.height = h

        this.gl.viewport(0, 0, w, h)

        mat4.perspective(this.proj, 0.5 * Math.PI, w / h, 0.01, 5)
        this.fullCore.setProj(this.proj)
    }

    draw (elapsed: number): void {
        this.gl.clear(this.gl.DEPTH_BUFFER_BIT || this.gl.COLOR_BUFFER_BIT)

        this.fullCore.setView(this.camera.matrix)

        this.fullCore.draw(this.gl, elapsed)
    }
}

export default VisRenderer

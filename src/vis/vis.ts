import { mat4 } from 'gl-matrix'
import { initGl } from '../lib/gl-wrap'
import { TileTextureMetadata } from '../lib/tile-texture'
import CoreRenderer, { CoreShape, CoreViewMode } from '../vis/core'
import Camera2D from '../lib/camera'

class VisRenderer {
    canvas: HTMLCanvasElement
    gl: WebGLRenderingContext
    core: CoreRenderer
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
        this.gl.enable(this.gl.BLEND)
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA)

        this.core = new CoreRenderer(
            this.gl,
            downscaledMaps,
            downscaledMetadata,
            punchcardMaps,
            punchcardMetadata
        )

        this.camera = new Camera2D([0, 0, 1], [0, 0, 0], [0, 1, 0])
        this.core.setView(this.camera.matrix)

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
        const wheel = (e: WheelEvent): void => {
            this.camera.zoom(e.deltaY)
        }
        const keydown = (e: KeyboardEvent): void => {
            if (e.key === '+') {
                this.core.punchRenderer.incPointSize(0.2)
            } else if (e.key === '-') {
                this.core.punchRenderer.incPointSize(-0.2)
            }
        }
        const resize = (): void => {
            this.resize()
        }

        this.canvas.addEventListener('mousedown', mousedown)
        this.canvas.addEventListener('mouseup', mouseup)
        this.canvas.addEventListener('mouseleave', mouseleave)
        this.canvas.addEventListener('mousemove', mousemove)
        this.canvas.addEventListener('wheel', wheel, { passive: true })
        window.addEventListener('keydown', keydown)
        window.addEventListener('resize', resize)
        return (): void => {
            this.canvas.removeEventListener('mousedown', mousedown)
            this.canvas.removeEventListener('mouseup', mouseup)
            this.canvas.removeEventListener('mouseleave', mouseleave)
            this.canvas.removeEventListener('wheel', wheel)
            window.removeEventListener('keydown', keydown)
            window.removeEventListener('resize', resize)
        }
    }

    resize (): void {
        const w = window.innerWidth * window.devicePixelRatio
        const h = window.innerHeight * window.devicePixelRatio

        this.canvas.width = w
        this.canvas.height = h

        this.gl.viewport(0, 0, w, h)

        mat4.perspective(this.proj, 0.5 * Math.PI, w / h, 0.01, 5)
        this.core.setProj(this.proj)
    }

    setBlending (magnitudes: Array<number>): void {
        this.core.setBlending(this.gl, magnitudes)
    }

    setZoom (t: number): void {
        this.camera.setZoom(t)
    }

    setCoreMineral (i: number): void {
        this.core.setMineral(i)
    }

    setCoreShape (s: CoreShape): void {
        this.core.setShape(s)
    }

    setCoreViewMode (m: CoreViewMode): void {
        this.core.setViewMode(m)
    }

    setCoreSpacing (horizontal: number, vertical: number): void {
        this.core.setSpacing(this.gl, horizontal, vertical)
    }

    draw (elapsed: number): void {
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height)
        this.gl.clear(this.gl.DEPTH_BUFFER_BIT || this.gl.COLOR_BUFFER_BIT)

        this.core.setView(this.camera.matrix)
        this.core.draw(this.gl, elapsed)
    }
}

export default VisRenderer

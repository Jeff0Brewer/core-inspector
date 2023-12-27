import { mat4 } from 'gl-matrix'
import { BoundRect } from '../lib/util'
import { initGl } from '../lib/gl-wrap'
import { TileTextureMetadata } from '../lib/tile-texture'
import { MineralSettings } from '../vis/mineral-blend'
import CoreRenderer, { CoreShape, CoreViewMode, CoreSettings } from '../vis/core'
import Camera2D, { CameraSettings } from '../lib/camera'

type VisSettings = {
    core: CoreSettings,
    mineral: MineralSettings,
    camera: CameraSettings
}

const VIS_DEFAULTS: VisSettings = {
    core: {
        spacing: [0.5, 0.5],
        viewMode: 'downscaled',
        shape: 'column',
        pointSize: 2,
        hovered: -1
    },
    mineral: {
        index: 0,
        blendMagnitude: 1
    },
    camera: {
        zoom: 0.5
    }
}

const PROJECTION_PARAMS = {
    fov: 0.5 * Math.PI,
    near: 0.01,
    far: 5
}

class VisRenderer {
    canvas: HTMLCanvasElement
    gl: WebGLRenderingContext
    core: CoreRenderer
    camera: Camera2D
    proj: mat4
    mousePos: [number, number]

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

        this.camera = new Camera2D(
            [0, 0, 0],
            [0, 0, 1],
            [0, 1, 0],
            VIS_DEFAULTS.camera.zoom
        )
        const aspect = window.innerWidth / window.innerHeight
        const { fov, near, far } = PROJECTION_PARAMS
        this.proj = mat4.perspective(mat4.create(), fov, aspect, near, far)

        const bounds = this.getUnprojectedViewportBounds()
        this.core = new CoreRenderer(
            this.gl,
            downscaledMaps,
            downscaledMetadata,
            punchcardMaps,
            punchcardMetadata,
            bounds,
            VIS_DEFAULTS.core,
            VIS_DEFAULTS.mineral
        )
        this.core.setView(this.gl, this.camera.matrix)

        this.mousePos = [0, 0]

        this.resize() // init canvas size, gl viewport, proj matrix
    }

    setHovered (id: number | undefined): void {
        this.core.stencilRenderer.currHovered = id
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

    setCoreSpacing (spacing: [number, number]): void {
        const bounds = this.getUnprojectedViewportBounds()
        this.core.setSpacing(this.gl, spacing, bounds)
    }

    getUnprojectedViewportBounds (): BoundRect {
        const { fov } = PROJECTION_PARAMS
        const heightBound = Math.tan(fov * 0.5) * this.camera.getFocusDistance()
        const widthBound = this.canvas.width / this.canvas.height * heightBound
        return {
            top: heightBound,
            bottom: -heightBound,
            left: -widthBound,
            right: widthBound
        }
    }

    resize (): void {
        const w = window.innerWidth * window.devicePixelRatio
        const h = window.innerHeight * window.devicePixelRatio

        this.canvas.width = w
        this.canvas.height = h

        this.gl.viewport(0, 0, w, h)

        const aspect = w / h
        const { fov, near, far } = PROJECTION_PARAMS
        mat4.perspective(this.proj, fov, aspect, near, far)

        this.core.setProj(this.gl, this.proj)
        this.core.stencilRenderer.resize(this.gl, w, h)
    }

    setupEventListeners (setZoom: (z: number) => void): (() => void) {
        let dragging = false
        const mousedown = (): void => { dragging = true }
        const mouseup = (): void => { dragging = false }
        const mouseleave = (): void => { dragging = false }
        const mousemove = (e: MouseEvent): void => {
            this.mousePos = [
                e.clientX * window.devicePixelRatio,
                this.canvas.height - e.clientY * window.devicePixelRatio
            ]
            if (dragging) {
                this.camera.pan(e.movementX, e.movementY)
            }
        }

        const wheel = (e: WheelEvent): void => {
            this.camera.zoom(e.deltaY)
            setZoom(this.camera.zoomT)
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

    draw (elapsed: number, setHovered: (id: number) => void): void {
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height)
        this.gl.clear(this.gl.DEPTH_BUFFER_BIT || this.gl.COLOR_BUFFER_BIT)

        this.core.setView(this.gl, this.camera.matrix)
        this.core.draw(this.gl, elapsed, this.mousePos, setHovered)
    }
}

export default VisRenderer
export { VIS_DEFAULTS }

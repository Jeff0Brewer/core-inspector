import { mat4 } from 'gl-matrix'
import { BoundRect } from '../lib/util'
import { initGl } from '../lib/gl-wrap'
import { TileTextureMetadata } from '../lib/tile-texture'
import { SectionIdMetadata } from '../lib/metadata'
import { BlendParams } from '../vis/mineral-blend'
import CoreRenderer, { CoreShape, CoreViewMode } from '../vis/core'
import Camera2D from '../lib/camera'

const VIEWPORT_PADDING: [number, number] = [0.9, 0.875]

type UiState = {
    setShape?: (s: CoreShape) => void,
    setViewMode?: (v: CoreViewMode) => void,
    setSpacing?: (s: [number, number]) => void,
    setZoom?: (z: number) => void,
    setHovered?: (h: string | undefined) => void,
    setBlending?: (p: BlendParams) => void,
    setPan?: (t: number) => void,
    setPanWidth?: (w: number) => void
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
    uiState: UiState

    constructor (
        canvas: HTMLCanvasElement,
        downscaledMaps: Array<HTMLImageElement>,
        punchcardMaps: Array<HTMLImageElement>,
        tileMetadata: TileTextureMetadata,
        idMetadata: SectionIdMetadata,
        uiState?: UiState
    ) {
        this.canvas = canvas
        this.gl = initGl(this.canvas)

        this.gl.enable(this.gl.BLEND)
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA)

        this.camera = new Camera2D(0, 'spiral')
        const aspect = window.innerWidth / window.innerHeight
        const { fov, near, far } = PROJECTION_PARAMS
        this.proj = mat4.perspective(mat4.create(), fov, aspect, near, far)

        this.core = new CoreRenderer(
            this.gl,
            downscaledMaps,
            punchcardMaps,
            tileMetadata,
            idMetadata,
            this.getViewportBounds(),
            this.setVertexBounds.bind(this)
        )

        this.resize() // init canvas size, gl viewport, proj matrix

        this.mousePos = [0, 0]
        this.uiState = uiState || {}
    }

    setBlending (params: BlendParams): void {
        this.core.setBlending(this.gl, params)
        this.uiState.setBlending?.(params)
    }

    setHovered (id: string | undefined): void {
        this.core.setHovered(this.gl, id)
        this.uiState.setHovered?.(id)
    }

    setZoom (t: number): void {
        this.camera.zoom(t)
        this.uiState.setZoom?.(t)

        this.core.wrapColumns(this.gl, this.getViewportBounds())
    }

    setPan (t: number): void {
        this.camera.setPan(t)
        this.uiState.setPan?.(t)
    }

    setShape (s: CoreShape): void {
        this.core.setShape(this.gl, s, this.getViewportBounds())
        this.camera.setMode(s)
        this.uiState.setShape?.(s)
    }

    setViewMode (m: CoreViewMode): void {
        this.core.setViewMode(this.gl, m, this.getViewportBounds())
        this.uiState.setViewMode?.(m)
    }

    setSpacing (spacing: [number, number]): void {
        this.core.setSpacing(this.gl, spacing, this.getViewportBounds())
        this.uiState.setSpacing?.(spacing)
    }

    setVertexBounds (bounds: BoundRect): void {
        this.camera.visBounds = bounds
    }

    getViewportBounds (): BoundRect {
        const { fov } = PROJECTION_PARAMS
        const yBound = Math.tan(fov * 0.5) * this.camera.zoomDistance()
        const xBound = window.innerWidth / window.innerHeight * yBound

        const [xPad, yPad] = VIEWPORT_PADDING
        const x = xBound * xPad
        const y = yBound * yPad

        const bounds = { top: y, bottom: -y, left: -x, right: x }

        this.camera.viewportBounds = bounds

        return bounds
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

        this.core.wrapColumns(this.gl, this.getViewportBounds())
    }

    setupEventListeners (): (() => void) {
        let dragging = false
        const mousedown = (): void => { dragging = true }
        const mouseup = (): void => { dragging = false }
        const mouseleave = (): void => {
            dragging = false
            this.setHovered(undefined)
        }
        const mousemove = (e: MouseEvent): void => {
            this.mousePos = [
                e.clientX * window.devicePixelRatio,
                this.canvas.height - e.clientY * window.devicePixelRatio
            ]
            if (dragging) {
                this.camera.mousedrag(e.movementX, e.movementY)
            }
        }

        const wheel = (e: WheelEvent): void => {
            this.camera.mousewheel(e.deltaY)
            this.uiState.setZoom?.(this.camera.zoomT)
            this.setHovered(undefined)
        }

        const keydown = (e: KeyboardEvent): void => {
            if (e.key === '+' || e.key === '=') {
                this.core.punchRenderer.incPointSize(0.2)
            } else if (e.key === '-' || e.key === '_') {
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
            this.canvas.removeEventListener('mousemove', mousemove)
            this.canvas.removeEventListener('mouseleave', mouseleave)
            this.canvas.removeEventListener('wheel', wheel)
            window.removeEventListener('keydown', keydown)
            window.removeEventListener('resize', resize)
        }
    }

    draw (elapsed: number): void {
        this.camera.update(elapsed)
        this.camera.updatePanState(this.uiState.setPan, this.uiState.setPanWidth)

        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height)
        this.gl.clear(this.gl.DEPTH_BUFFER_BIT | this.gl.COLOR_BUFFER_BIT)

        this.core.draw(
            this.gl,
            this.camera.matrix,
            elapsed,
            this.mousePos,
            this.setHovered.bind(this)
        )
    }
}

export default VisRenderer
export type { UiState }

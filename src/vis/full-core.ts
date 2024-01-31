import { mat4, vec2 } from 'gl-matrix'
import { BoundRect, clamp, ease } from '../lib/util'
import { initGl, GlContext } from '../lib/gl-wrap'
import { TileTextureMetadata } from '../lib/tile-texture'
import { SectionIdMetadata } from '../lib/metadata'
import MineralBlender, { BlendParams } from '../vis/mineral-blend'
import Camera2D from '../lib/camera'
import DownscaledCoreRenderer from '../vis/downscaled-core'
import PunchcardCoreRenderer from '../vis/punchcard-core'
import AccentLineRenderer from '../vis/accent-lines'
import StencilCoreRenderer from '../vis/stencil-core'
import HoverHighlightRenderer from '../vis/hover-highlight'
import { getCorePositions, getCoreTexCoords } from '../lib/vert-gen'

const CALIBRATION_OPTIONS = { show: 0, remove: 1 } as const
type CalibrationOption = keyof typeof CALIBRATION_OPTIONS

const CORE_SHAPES = { column: 0, spiral: 1 } as const
type CoreShape = keyof typeof CORE_SHAPES

type CoreViewMode = 'punchcard' | 'downscaled'

const TRANSFORM_SPEED = 1
const VIEWPORT_PADDING: [number, number] = [0.9, 0.875]
const PROJECTION_PARAMS = {
    fov: 0.5 * Math.PI,
    near: 0.01,
    far: 5
}

/*
 * UI STATE
 * - react state setters to be passed into visualization reference
 * - react / visualization state is coordinated by calling visualization
 *   setter methods from react, which will then call the react state setter
 *   from inside the visualization if one has been attached, propagating
 *   state back to the ui
 * - this prevents state updates if visualization is not initialized yet
 *   and always keeps state coordinated so long as react setters are
 *   attached
 * - for state that doesn't get set anywhere from within the visualization
 *   (i.e. blending parameters) the visualization setter method can be called
 *   directly with react state passed in and nothing needs to be added here
 */
type UiState = {
    setCalibration?: (o: CalibrationOption) => void,
    setShape?: (s: CoreShape) => void,
    setViewMode?: (v: CoreViewMode) => void,
    setSpacing?: (s: [number, number]) => void,
    setZoom?: (z: number) => void,
    setHovered?: (h: string | undefined) => void,
    setPan?: (t: number) => void,
    setPanWidth?: (w: number) => void
}

class FullCoreRenderer {
    canvas: HTMLCanvasElement
    gl: GlContext
    downscaledCore: DownscaledCoreRenderer
    punchcardCore: PunchcardCoreRenderer
    stencilCore: StencilCoreRenderer
    hoverHighlight: HoverHighlightRenderer
    accentLines: AccentLineRenderer
    metadata: TileTextureMetadata
    spacing: [number, number]
    calibration: CalibrationOption
    viewMode: CoreViewMode
    targetShape: CoreShape
    shapeT: number
    camera: Camera2D
    proj: mat4
    mousePos: vec2
    uiState: UiState
    dropped: boolean

    constructor (
        canvas: HTMLCanvasElement,
        downscaledMaps: Array<HTMLImageElement>,
        punchcardMaps: Array<HTMLImageElement>,
        tileMetadata: TileTextureMetadata,
        idMetadata: SectionIdMetadata,
        minerals: Array<string>,
        uiState: UiState = {}
    ) {
        this.canvas = canvas
        this.spacing = [0, 0]
        this.calibration = 'show'
        this.viewMode = 'downscaled'
        this.targetShape = 'column'
        this.shapeT = CORE_SHAPES[this.targetShape]
        this.metadata = tileMetadata
        this.uiState = uiState
        this.mousePos = [0, 0]
        this.dropped = false

        this.gl = initGl(this.canvas)
        this.gl.enable(this.gl.BLEND)
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA)

        const aspect = window.innerWidth / window.innerHeight
        const { fov, near, far } = PROJECTION_PARAMS
        this.proj = mat4.perspective(mat4.create(), fov, aspect, near, far)

        this.camera = new Camera2D(0, 'spiral')

        const { downTexCoords, punchTexCoords } = getCoreTexCoords(
            tileMetadata,
            CALIBRATION_OPTIONS[this.calibration]
        )
        const { downPositions, punchPositions, accentPositions } = getCorePositions(
            tileMetadata,
            this.spacing,
            this.getViewportBounds(),
            this.targetShape,
            // always punchcard view mode to ensure punchcard vertices are
            // initialized regardless of initial view mode
            'punchcard',
            CALIBRATION_OPTIONS[this.calibration]
        )

        this.downscaledCore = new DownscaledCoreRenderer(
            this.gl,
            new MineralBlender(this.gl, downscaledMaps, minerals),
            downPositions,
            downTexCoords,
            this.targetShape
        )

        this.punchcardCore = new PunchcardCoreRenderer(
            this.gl,
            new MineralBlender(this.gl, punchcardMaps, minerals),
            punchPositions,
            punchTexCoords,
            this.targetShape
        )

        this.stencilCore = new StencilCoreRenderer(
            this.gl,
            downPositions,
            tileMetadata,
            idMetadata,
            this.setHovered.bind(this)
        )

        this.hoverHighlight = new HoverHighlightRenderer(
            this.gl,
            downPositions,
            tileMetadata,
            idMetadata
        )

        this.accentLines = new AccentLineRenderer(
            this.gl,
            accentPositions,
            this.targetShape,
            tileMetadata
        )

        // init canvas size, gl viewport, proj matrix
        this.resize()
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

        this.downscaledCore.setProj(this.proj)

        this.punchcardCore.setProj(this.proj)
        this.punchcardCore.setWindowHeight(h)

        this.stencilCore.setProj(this.proj)
        this.stencilCore.resize(this.gl, w, h)

        this.hoverHighlight.setProj(this.proj)
        this.hoverHighlight.setWindowHeight(h)

        this.accentLines.setProj(this.proj)

        this.wrapColumns()
    }

    setVertexBounds (b: BoundRect): void {
        this.camera.visBounds = b
    }

    setBlending (params: BlendParams): void {
        this.downscaledCore.minerals.update(this.gl, params)
        this.punchcardCore.minerals.update(this.gl, params)
    }

    setHovered (id: string | undefined): void {
        this.hoverHighlight.setHovered(this.gl, id)
        this.uiState.setHovered?.(id)
    }

    setPan (t: number): void {
        this.camera.setPan(t)
        this.uiState.setPan?.(t)
    }

    setZoom (t: number): void {
        this.camera.zoom(t)
        this.wrapColumns()
        this.uiState.setZoom?.(t)
    }

    setShape (s: CoreShape): void {
        this.targetShape = s
        this.genVerts()
        this.camera.setMode(s)
        this.uiState.setShape?.(s)
    }

    setSpacing (s: [number, number]): void {
        this.spacing = s
        this.genVerts()
        this.uiState.setSpacing?.(s)
    }

    setCalibration (o: CalibrationOption): void {
        this.calibration = o
        const { downTexCoords, punchTexCoords } = getCoreTexCoords(
            this.metadata,
            CALIBRATION_OPTIONS[this.calibration]
        )
        this.downscaledCore.texCoordBuffer.setData(this.gl, downTexCoords)
        this.punchcardCore.texCoordBuffer.setData(this.gl, punchTexCoords)
        this.genVerts()
        this.uiState.setCalibration?.(o)
    }

    setViewMode (m: CoreViewMode): void {
        this.viewMode = m
        // since downscaled verts used in stencil / hover regardless of view mode
        // only need to ensure that punchcard verts are updated
        if (m === 'punchcard') {
            this.genVerts()
        }
        this.uiState.setViewMode?.(m)
    }

    // get bounds of current viewport in gl units, needed for wrapping
    // columns to fit viewport during vertex generation
    getViewportBounds (): BoundRect {
        const { fov } = PROJECTION_PARAMS
        const yBound = Math.tan(fov * 0.5) * this.camera.zoomDistance()
        const xBound = window.innerWidth / window.innerHeight * yBound

        // add padding to viewport as percentage of available space
        const [xPad, yPad] = VIEWPORT_PADDING
        const x = xBound * xPad
        const y = yBound * yPad

        const bounds = { top: y, bottom: -y, left: -x, right: x }
        this.camera.viewportBounds = bounds

        return bounds
    }

    // regenerates full core vertices required for current visualization state.
    // must be called on changes to layout parameters (spacing, vp bounds / zoom) to update layout,
    // or representation parameters (view mode, shape) to ensure representation
    // specific vertices have been generated with latest layout params
    genVerts (): void {
        const viewportBounds = this.getViewportBounds()
        const { downPositions, punchPositions, accentPositions, vertexBounds } = getCorePositions(
            this.metadata,
            this.spacing,
            viewportBounds,
            this.targetShape,
            this.viewMode,
            CALIBRATION_OPTIONS[this.calibration]
        )

        this.downscaledCore.setPositions(this.gl, downPositions, this.targetShape)
        this.stencilCore.setPositions(this.gl, downPositions)
        this.hoverHighlight.setPositions(downPositions)
        this.accentLines.setPositions(this.gl, accentPositions, this.targetShape)

        // punchcard vertices only generated if currently in punchcard view
        if (this.viewMode === 'punchcard') {
            this.punchcardCore.setPositions(this.gl, punchPositions, this.targetShape)
        }

        this.setVertexBounds(vertexBounds)

        // must generate both shapes for punchcard if in middle of transition
        // because vertices may not have been generated yet
        if (this.viewMode === 'punchcard' && Math.round(this.shapeT) !== this.shapeT) {
            const otherShape = this.targetShape === 'column' ? 'spiral' : 'column'
            // this is mega slow, generates vertices for all visualization elements,
            // but still < 16ms and this edge case happens very rarely so fine for now
            const { punchPositions } = getCorePositions(
                this.metadata,
                this.spacing,
                viewportBounds,
                otherShape,
                this.viewMode,
                CALIBRATION_OPTIONS[this.calibration]
            )
            this.punchcardCore.setPositions(this.gl, punchPositions, otherShape)
        }
    }

    wrapColumns (): void {
        if (this.targetShape === 'column') {
            this.genVerts()
        }
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
                this.punchcardCore.incPointSize(0.2)
            } else if (e.key === '-' || e.key === '_') {
                this.punchcardCore.incPointSize(-0.2)
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
        if (this.dropped) { return }

        this.camera.update(elapsed)
        // TODO: fix pan state, should only be updated with pan / bounds change
        this.camera.updatePanState(this.uiState.setPan, this.uiState.setPanWidth)

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null)
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height)
        this.gl.clear(this.gl.DEPTH_BUFFER_BIT | this.gl.COLOR_BUFFER_BIT)

        const incSign = Math.sign(CORE_SHAPES[this.targetShape] - this.shapeT)
        this.shapeT += incSign * TRANSFORM_SPEED * elapsed
        this.shapeT = clamp(this.shapeT, 0, 1)
        const easedShapeT = ease(this.shapeT)

        if (this.viewMode === 'downscaled') {
            this.downscaledCore.draw(this.gl, this.camera.matrix, easedShapeT)
        } else {
            this.punchcardCore.draw(this.gl, this.camera.matrix, easedShapeT)
        }

        this.stencilCore.draw(this.gl, this.camera.matrix, easedShapeT, this.mousePos)
        this.hoverHighlight.draw(this.gl, this.camera.matrix, this.mousePos)
        this.accentLines.draw(this.gl, this.camera.matrix, easedShapeT)
    }

    drop (): void {
        this.downscaledCore.drop(this.gl)
        this.punchcardCore.drop(this.gl)
        this.stencilCore.drop(this.gl)
        this.hoverHighlight.drop(this.gl)
        this.accentLines.drop(this.gl)

        this.dropped = true
    }
}

export default FullCoreRenderer
export { TRANSFORM_SPEED }
export type {
    UiState,
    CoreShape,
    CoreViewMode,
    CalibrationOption
}

import { mat4, vec2 } from 'gl-matrix'
import { BoundRect, clamp, ease } from '../lib/util'
import { initGl, GlContext } from '../lib/gl-wrap'
import { TileTextureMetadata } from '../lib/metadata'
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

type CoreSpiralOrder = 'in' | 'out'

const TRANSFORM_SPEED = 1
const VIEWPORT_PADDING: [number, number] = [0.9, 0.85]
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
    setPart?: (p: string) => void,
    setCalibration?: (o: CalibrationOption) => void,
    setShape?: (s: CoreShape) => void,
    setViewMode?: (v: CoreViewMode) => void,
    setSpacing?: (s: [number, number]) => void,
    setZoom?: (z: number) => void,
    setHovered?: (h: string | null) => void,
    setPan?: (t: number) => void,
    setPanWidth?: (w: number) => void,
    setSpiralOrder?: (o: CoreSpiralOrder) => void
}

class CoreRenderer {
    canvas: HTMLCanvasElement
    gl: GlContext
    mineralBlender: MineralBlender
    punchcardBlender: MineralBlender
    downscaledCore: DownscaledCoreRenderer
    punchcardCore: PunchcardCoreRenderer
    stencilCore: StencilCoreRenderer
    hoverHighlight: HoverHighlightRenderer
    accentLines: AccentLineRenderer
    metadata: TileTextureMetadata
    spacing: [number, number]
    viewMode: CoreViewMode

    targetCalibration: CalibrationOption
    calibrationT: number

    targetShape: CoreShape
    shapeT: number

    spiralOrder: CoreSpiralOrder

    camera: Camera2D
    proj: mat4
    mousePos: vec2
    uiState: UiState
    dropped: boolean

    ids: Array<string>

    constructor (
        canvas: HTMLCanvasElement,
        mineralMaps: Array<HTMLImageElement>,
        punchcardMaps: Array<HTMLImageElement>,
        metadata: TileTextureMetadata,
        ids: Array<string>,
        minerals: Array<string>,
        uiState: UiState = {}
    ) {
        this.canvas = canvas
        this.spacing = [0, 0]
        this.viewMode = 'downscaled'

        this.targetShape = 'column'
        this.shapeT = CORE_SHAPES[this.targetShape]

        this.targetCalibration = 'show'
        this.calibrationT = CALIBRATION_OPTIONS[this.targetCalibration]

        this.spiralOrder = 'out'

        this.metadata = metadata
        this.uiState = uiState
        this.mousePos = [0, 0]
        this.dropped = false

        this.ids = ids

        this.gl = initGl(this.canvas)
        this.gl.enable(this.gl.BLEND)
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA)

        const aspect = window.innerWidth / window.innerHeight
        const { fov, near, far } = PROJECTION_PARAMS
        this.proj = mat4.perspective(mat4.create(), fov, aspect, near, far)

        this.camera = new Camera2D(0, 'spiral')

        this.mineralBlender = new MineralBlender(this.gl, mineralMaps, minerals)
        this.punchcardBlender = new MineralBlender(this.gl, punchcardMaps, minerals)

        const { downTexCoords, punchTexCoords } = getCoreTexCoords(this.metadata, this.calibrationT)
        const { downPositions, punchPositions, accentPositions } = getCorePositions(
            this.metadata,
            this.spacing,
            this.getViewportBounds(),
            this.targetShape,
            // always punchcard view mode to ensure punchcard vertices are
            // initialized regardless of initial view mode
            'punchcard',
            this.calibrationT
        )

        this.downscaledCore = new DownscaledCoreRenderer(
            this.gl,
            downPositions,
            downTexCoords,
            this.targetShape
        )

        this.punchcardCore = new PunchcardCoreRenderer(
            this.gl,
            punchPositions,
            punchTexCoords,
            this.targetShape
        )

        this.stencilCore = new StencilCoreRenderer(
            this.gl,
            downPositions,
            this.metadata,
            this.ids
        )

        this.hoverHighlight = new HoverHighlightRenderer(
            this.gl,
            downPositions,
            this.metadata,
            this.ids
        )

        this.accentLines = new AccentLineRenderer(
            this.gl,
            accentPositions,
            this.targetShape,
            this.metadata
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
        this.mineralBlender.update(this.gl, params)
        this.punchcardBlender.update(this.gl, params)
    }

    setHovered (id: string | null): void {
        this.hoverHighlight.setHovered(this.gl, id)
        this.uiState.setHovered?.(id)
    }

    setPan (t: number): void {
        this.camera.setPan(t)
        this.uiState.setPan?.(t)
    }

    setZoom (t: number): void {
        this.camera.zoom(1 - t)
        this.wrapColumns()
        this.uiState.setZoom?.(t)
    }

    setSpacing (s: [number, number]): void {
        this.spacing = s
        this.genVerts()
        this.uiState.setSpacing?.(s)
    }

    setShape (s: CoreShape): void {
        this.targetShape = s
        this.genVerts()
        this.camera.setMode(s)
        this.uiState.setShape?.(s)
    }

    setSpiralOrder (o: CoreSpiralOrder): void {
        this.spiralOrder = o
        this.uiState.setSpiralOrder?.(o)
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

    setCalibration (o: CalibrationOption): void {
        this.targetCalibration = o
        this.uiState.setCalibration?.(o)
    }

    initCalibration (o: CalibrationOption): void {
        this.targetCalibration = o
        this.calibrationT = CALIBRATION_OPTIONS[o]
        this.genVerts()
        this.genTexCoords()
        this.uiState.setCalibration?.(o)
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

    genTexCoords (): void {
        const { downTexCoords, punchTexCoords } = getCoreTexCoords(this.metadata, ease(this.calibrationT))
        this.downscaledCore.texCoordBuffer.setData(this.gl, downTexCoords)
        this.punchcardCore.texCoordBuffer.setData(this.gl, punchTexCoords)
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
            ease(this.calibrationT)
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
                ease(this.calibrationT)
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
        let dragStartX = 0
        let dragStartY = 0
        const mousedown = (e: MouseEvent): void => {
            dragging = true
            dragStartX = e.clientX
            dragStartY = e.clientY
        }
        const mouseup = (e: MouseEvent): void => {
            dragging = false
            const dx = Math.abs(dragStartX - e.clientX)
            const dy = Math.abs(dragStartY - e.clientY)
            const dragDelta = Math.sqrt(dx * dx + dy * dy)
            if (dragDelta < 2) {
                const clickedPart = this.stencilCore.update(
                    this.gl,
                    this.camera.matrix,
                    this.mousePos
                )
                if (clickedPart !== null) {
                    this.uiState.setPart?.(clickedPart)
                }
            }
        }
        const mouseleave = (): void => {
            dragging = false
            this.setHovered(null)
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
            this.uiState.setZoom?.(1 - this.camera.zoomT)
            this.setHovered(null)
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

        this.calibrationT += Math.sign(CALIBRATION_OPTIONS[this.targetCalibration] - this.calibrationT) * TRANSFORM_SPEED * elapsed
        this.calibrationT = clamp(this.calibrationT, 0, 1)

        if (this.calibrationT !== 0 && this.calibrationT !== 1) {
            this.genTexCoords()
            this.genVerts()
        }

        if (this.viewMode === 'downscaled') {
            this.downscaledCore.draw(
                this.gl,
                this.mineralBlender,
                this.camera.matrix,
                easedShapeT
            )
        } else {
            this.punchcardCore.draw(
                this.gl,
                this.punchcardBlender,
                this.camera.matrix,
                easedShapeT
            )
        }

        const hoveredId = this.stencilCore.updateHover(
            this.gl,
            this.camera.matrix,
            easedShapeT,
            this.mousePos
        )
        if (hoveredId !== undefined) {
            this.setHovered(hoveredId)
        }

        this.hoverHighlight.draw(this.gl, this.camera.matrix, this.mousePos)
        this.accentLines.draw(this.gl, this.camera.matrix, easedShapeT)
    }

    drop (): void {
        this.mineralBlender.drop(this.gl)
        this.downscaledCore.drop(this.gl)
        this.punchcardCore.drop(this.gl)
        this.stencilCore.drop(this.gl)
        this.hoverHighlight.drop(this.gl)
        this.accentLines.drop(this.gl)

        this.dropped = true
    }
}

export default CoreRenderer
export { TRANSFORM_SPEED }
export type {
    UiState,
    CoreShape,
    CoreViewMode,
    CalibrationOption,
    CoreSpiralOrder
}

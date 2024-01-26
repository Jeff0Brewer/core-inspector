import { mat4 } from 'gl-matrix'
import { GlContext } from '../lib/gl-wrap'
import { clamp, ease, BoundRect } from '../lib/util'
import { TileTextureMetadata } from '../lib/tile-texture'
import { SectionIdMetadata } from '../lib/metadata'
import MineralBlender, { BlendParams } from '../vis/mineral-blend'
import DownscaledCoreRenderer from '../vis/downscaled-core'
import PunchcardCoreRenderer from '../vis/punchcard-core'
import AccentLineRenderer from '../vis/accent-lines'
import StencilCoreRenderer from '../vis/stencil-core'
import HoverHighlightRenderer from '../vis/hover-highlight'
import { getCorePositions, getCoreTexCoords } from '../lib/vert-gen'

// get enum for core shape since numeric values used as
// uniform in shader to control shape transition
const CORE_SHAPES = { column: 0, spiral: 1 } as const
type CoreShape = keyof typeof CORE_SHAPES

type CoreViewMode = 'punchcard' | 'downscaled'

const TRANSFORM_SPEED = 1

class CoreRenderer {
    downRenderer: DownscaledCoreRenderer
    punchRenderer: PunchcardCoreRenderer
    accentRenderer: AccentLineRenderer
    stencilRenderer: StencilCoreRenderer
    highlightRenderer: HoverHighlightRenderer
    metadata: TileTextureMetadata
    currSpacing: [number, number]
    viewMode: CoreViewMode
    targetShape: CoreShape
    shapeT: number
    setVertexBounds: (b: BoundRect) => void

    constructor (
        gl: GlContext,
        downMineralMaps: Array<HTMLImageElement>,
        punchMineralMaps: Array<HTMLImageElement>,
        tileMetadata: TileTextureMetadata,
        idMetadata: SectionIdMetadata,
        minerals: Array<string>,
        bounds: BoundRect,
        setVertexBounds: (b: BoundRect) => void,
        setHovered: (id: string | undefined) => void
    ) {
        // can be set to anything, will be aligned with ui state on load
        this.currSpacing = [0, 0]
        this.viewMode = 'downscaled'
        this.targetShape = 'column'
        this.metadata = tileMetadata
        this.setVertexBounds = setVertexBounds

        // shapeT is t value used in linear interpolation between
        // core shapes in shader for transition, smoothly transitions
        // from current t value to target shape t value
        this.shapeT = CORE_SHAPES[this.targetShape]

        const { downTexCoords, punchTexCoords } = getCoreTexCoords(tileMetadata)
        const { downPositions, punchPositions, accentPositions } = getCorePositions(
            tileMetadata,
            this.currSpacing,
            bounds,
            this.targetShape,
            // always punchcard view mode to ensure punchcard vertices are
            // initialized regardless of initial view mode
            'punchcard'
        )

        this.downRenderer = new DownscaledCoreRenderer(
            gl,
            new MineralBlender(gl, downMineralMaps, minerals),
            downPositions,
            downTexCoords,
            this.targetShape
        )
        this.punchRenderer = new PunchcardCoreRenderer(
            gl,
            new MineralBlender(gl, punchMineralMaps, minerals),
            punchPositions,
            punchTexCoords,
            this.targetShape
        )
        this.accentRenderer = new AccentLineRenderer(
            gl,
            accentPositions,
            this.targetShape,
            tileMetadata
        )
        this.stencilRenderer = new StencilCoreRenderer(
            gl,
            downPositions,
            tileMetadata,
            idMetadata,
            setHovered
        )
        this.highlightRenderer = new HoverHighlightRenderer(
            gl,
            downPositions,
            tileMetadata,
            idMetadata
        )
    }

    setProj (gl: GlContext, m: mat4): void {
        this.downRenderer.program.bind(gl)
        this.downRenderer.setProj(m)

        this.punchRenderer.program.bind(gl)
        this.punchRenderer.setProj(m)
        this.punchRenderer.setDpr(window.devicePixelRatio)

        this.stencilRenderer.program.bind(gl)
        this.stencilRenderer.setProj(m)

        this.highlightRenderer.program.bind(gl)
        this.highlightRenderer.setProj(m)

        this.accentRenderer.program.bind(gl)
        this.accentRenderer.setProj(m)
    }

    setBlending (gl: GlContext, params: BlendParams): void {
        this.downRenderer.minerals.update(gl, params)
        this.punchRenderer.minerals.update(gl, params)
    }

    setHovered (gl: GlContext, id: string | undefined): void {
        this.highlightRenderer.setHovered(gl, id)
    }

    setSpacing (gl: GlContext, spacing: [number, number], bounds: BoundRect): void {
        this.currSpacing = spacing
        this.genVerts(gl, bounds)
    }

    setShape (gl: GlContext, shape: CoreShape, bounds: BoundRect): void {
        this.targetShape = shape
        this.genVerts(gl, bounds)
    }

    setViewMode (gl: GlContext, v: CoreViewMode, bounds: BoundRect): void {
        this.viewMode = v
        // since downscaled verts used in stencil / hover regardless of view mode
        // only need to ensure that punchcard verts are updated
        if (v === 'punchcard') {
            this.genVerts(gl, bounds)
        }
    }

    wrapColumns (gl: GlContext, bounds: BoundRect): void {
        if (this.targetShape === 'column') {
            this.genVerts(gl, bounds)
        }
    }

    // regenerates full core vertices required for current visualization state.
    // must be called on changes to layout parameters (spacing, vp bounds / zoom) to update layout,
    // or representation parameters (view mode, shape) to ensure representation
    // specific vertices have been generated with latest layout params
    genVerts (gl: GlContext, viewportBounds: BoundRect): void {
        const { downPositions, punchPositions, accentPositions, vertexBounds } = getCorePositions(
            this.metadata,
            this.currSpacing,
            viewportBounds,
            this.targetShape,
            this.viewMode
        )

        // downscaled / accent line vertices always generated since always visible
        this.downRenderer.setPositions(gl, downPositions, this.targetShape)
        this.stencilRenderer.setPositions(gl, downPositions)
        this.highlightRenderer.setPositions(downPositions)
        this.accentRenderer.setPositions(gl, accentPositions, this.targetShape)

        // punchcard vertices only generated if currently in punchcard view
        if (this.viewMode === 'punchcard') {
            this.punchRenderer.setPositions(gl, punchPositions, this.targetShape)
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
                this.currSpacing,
                viewportBounds,
                otherShape,
                this.viewMode
            )
            this.punchRenderer.setPositions(gl, punchPositions, otherShape)
        }
    }

    draw (gl: GlContext, elapsed: number, view: mat4, mousePos: [number, number]): void {
        // update shapeT based on current target shape for transition
        const incSign = Math.sign(CORE_SHAPES[this.targetShape] - this.shapeT)
        this.shapeT += incSign * TRANSFORM_SPEED * elapsed
        this.shapeT = clamp(this.shapeT, 0, 1)
        const easedShapeT = ease(this.shapeT)

        if (this.viewMode === 'downscaled') {
            this.downRenderer.draw(gl, view, easedShapeT)
        } else {
            this.punchRenderer.draw(gl, view, easedShapeT)
        }

        this.stencilRenderer.draw(gl, view, easedShapeT, mousePos)
        this.highlightRenderer.draw(gl, view)
        this.accentRenderer.draw(gl, view, easedShapeT)
    }

    drop (gl: GlContext): void {
        this.downRenderer.drop(gl)
        this.punchRenderer.drop(gl)
        this.accentRenderer.drop(gl)
        this.stencilRenderer.drop(gl)
        this.highlightRenderer.drop(gl)
    }
}

export default CoreRenderer
export { TRANSFORM_SPEED }
export type {
    CoreViewMode,
    CoreShape
}

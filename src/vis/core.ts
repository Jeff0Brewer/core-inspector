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

const TRANSFORM_SPEED = 1
const SHAPE_T_VALUES = { column: 0, spiral: 1 } as const

type CoreShape = keyof typeof SHAPE_T_VALUES
type CoreViewMode = 'punchcard' | 'downscaled'

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
        bounds: BoundRect,
        setVertexBounds: (b: BoundRect) => void
    ) {
        // can be set to anything, will be aligned with ui state on load
        this.currSpacing = [0, 0]
        this.viewMode = 'downscaled'
        this.targetShape = 'column'

        this.shapeT = SHAPE_T_VALUES[this.targetShape]
        this.metadata = tileMetadata

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
            new MineralBlender(gl, downMineralMaps),
            downPositions,
            downTexCoords,
            this.targetShape
        )
        this.punchRenderer = new PunchcardCoreRenderer(
            gl,
            new MineralBlender(gl, punchMineralMaps),
            punchPositions,
            punchTexCoords,
            3.5,
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
            undefined
        )
        this.highlightRenderer = new HoverHighlightRenderer(
            gl,
            downPositions,
            tileMetadata,
            idMetadata
        )

        this.setVertexBounds = setVertexBounds
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
        this.stencilRenderer.setHovered(id)
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

    genVerts (gl: GlContext, viewportBounds: BoundRect): void {
        const { downPositions, punchPositions, accentPositions, vertexBounds } = getCorePositions(
            this.metadata,
            this.currSpacing,
            viewportBounds,
            this.targetShape,
            this.viewMode
        )
        if (punchPositions.length > 0) {
            this.punchRenderer.setPositions(gl, punchPositions, this.targetShape)
        }
        this.accentRenderer.setPositions(gl, accentPositions, this.targetShape)
        this.downRenderer.setPositions(gl, downPositions, this.targetShape)
        this.stencilRenderer.setPositions(gl, downPositions)
        this.highlightRenderer.setPositions(downPositions)

        this.setVertexBounds(vertexBounds)
    }

    draw (
        gl: GlContext,
        view: mat4,
        elapsed: number,
        mousePos: [number, number],
        setHovered: (id: string | undefined) => void
    ): void {
        const incSign = Math.sign(SHAPE_T_VALUES[this.targetShape] - this.shapeT)
        this.shapeT += incSign * TRANSFORM_SPEED * elapsed
        this.shapeT = clamp(this.shapeT, 0, 1)
        const easedShapeT = ease(this.shapeT)

        gl.bindFramebuffer(gl.FRAMEBUFFER, null)

        if (this.viewMode === 'downscaled') {
            this.downRenderer.draw(gl, view, easedShapeT)
        } else {
            this.punchRenderer.draw(gl, view, easedShapeT)
        }

        this.stencilRenderer.draw(gl, view, easedShapeT, mousePos, setHovered)
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

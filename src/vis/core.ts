import { mat4 } from 'gl-matrix'
import { clamp, ease, BoundRect } from '../lib/util'
import { TileTextureMetadata } from '../lib/tile-texture'
import { SectionIdMetadata } from '../lib/metadata'
import MineralBlender, { BlendParams } from '../vis/mineral-blend'
import DownscaledCoreRenderer, {
    addDownscaledSpiralPositions,
    addDownscaledColumnPositions,
    addDownscaledTexCoords,
    NUM_ROWS,
    VERT_PER_ROW
} from '../vis/downscaled-core'
import PunchcardCoreRenderer, {
    addPunchcardSpiralPositions,
    addPunchcardColumnPositions,
    addPunchcardTexCoords,
    POINT_PER_ROW
} from '../vis/punchcard-core'
import AccentLineRenderer, {
    addAccentLineSpiralPositions,
    addAccentLineColumnPositions,
    VERT_PER_LINE
} from '../vis/accent-lines'
import StencilCoreRenderer from '../vis/stencil-core'
import HoverHighlightRenderer from '../vis/hover-highlight'

const POS_FPV = 2
const TEX_FPV = 2

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
        gl: WebGLRenderingContext,
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
            this.targetShape
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

    setProj (gl: WebGLRenderingContext, m: mat4): void {
        gl.useProgram(this.downRenderer.program)
        this.downRenderer.setProj(m)

        gl.useProgram(this.punchRenderer.program)
        this.punchRenderer.setProj(m)
        this.punchRenderer.setDpr(window.devicePixelRatio)

        this.stencilRenderer.program.bind(gl)
        this.stencilRenderer.setProj(m)

        this.highlightRenderer.program.bind(gl)
        this.highlightRenderer.setProj(m)

        gl.useProgram(this.accentRenderer.program)
        this.accentRenderer.setProj(m)
    }

    setBlending (gl: WebGLRenderingContext, params: BlendParams): void {
        this.downRenderer.minerals.update(gl, params)
        this.punchRenderer.minerals.update(gl, params)
    }

    setHovered (gl: WebGLRenderingContext, id: string | undefined): void {
        this.highlightRenderer.setHovered(gl, id)
        this.stencilRenderer.setHovered(id)
    }

    setSpacing (gl: WebGLRenderingContext, spacing: [number, number], bounds: BoundRect): void {
        this.currSpacing = spacing
        this.genVerts(gl, bounds)
    }

    setShape (gl: WebGLRenderingContext, shape: CoreShape, bounds: BoundRect): void {
        this.targetShape = shape
        this.genVerts(gl, bounds)
    }

    setViewMode (gl: WebGLRenderingContext, v: CoreViewMode, bounds: BoundRect): void {
        this.viewMode = v
        // since downscaled verts used in stencil / hover regardless of view mode
        // only need to ensure that punchcard verts are updated
        if (v === 'punchcard') {
            this.genVerts(gl, bounds)
        }
    }

    wrapColumns (gl: WebGLRenderingContext, bounds: BoundRect): void {
        if (this.targetShape === 'column') {
            this.genVerts(gl, bounds)
        }
    }

    genVerts (gl: WebGLRenderingContext, viewportBounds: BoundRect): void {
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
        gl: WebGLRenderingContext,
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
}

const TILE_WIDTH = 0.025
const MIN_RADIUS = TILE_WIDTH * 5
const MAX_RADIUS = 1
const RADIUS_RANGE = MAX_RADIUS - MIN_RADIUS

const getCoreTexCoords = (metadata: TileTextureMetadata): {
    downTexCoords: Float32Array,
    punchTexCoords: Float32Array
} => {
    const downFloatPerTile = NUM_ROWS * VERT_PER_ROW * TEX_FPV
    const punchFloatPerTile = (numRows: number): number => numRows * POINT_PER_ROW * TEX_FPV

    const downCoords = new Float32Array(metadata.numTiles * downFloatPerTile)
    const punchCoords = new Float32Array(punchFloatPerTile(metadata.punchTotalRows))

    let downOffset = 0
    let punchOffset = 0

    for (let i = 0; i < metadata.numTiles; i++) {
        addDownscaledTexCoords(
            downCoords,
            downOffset,
            metadata.downTiles[i]
        )
        addPunchcardTexCoords(
            punchCoords,
            punchOffset,
            metadata.punchTiles[i],
            metadata.punchNumRows[i]
        )

        downOffset += downFloatPerTile
        punchOffset += punchFloatPerTile(metadata.punchNumRows[i])
    }

    return {
        downTexCoords: new Float32Array(downCoords),
        punchTexCoords: new Float32Array(punchCoords)
    }
}

// calculate positions for downsampled and punchcard
// representations in same place to simplify alignment
const getCorePositions = (
    metadata: TileTextureMetadata,
    spacing: [number, number],
    viewportBounds: BoundRect,
    shape: CoreShape,
    viewMode: CoreViewMode
): {
    downPositions: Float32Array,
    punchPositions: Float32Array,
    accentPositions: Float32Array,
    vertexBounds: BoundRect
} => {
    const downFloatPerTile = NUM_ROWS * VERT_PER_ROW * POS_FPV
    const punchFloatPerTile = (numRows: number): number => numRows * POINT_PER_ROW * POS_FPV
    const accentFloatPerTile = VERT_PER_LINE * POS_FPV

    const downPositions = new Float32Array(metadata.numTiles * downFloatPerTile)
    const punchPositions = new Float32Array(punchFloatPerTile(metadata.punchTotalRows))
    const accentPositions = new Float32Array(metadata.numTiles * accentFloatPerTile)

    // get spacing from percentage of tile width
    const [horizontalSpacing, verticalSpacing] = spacing.map(s => s * TILE_WIDTH)

    const numRotation = RADIUS_RANGE / (TILE_WIDTH + horizontalSpacing)
    const avgAngleSpacing = verticalSpacing / (MIN_RADIUS + RADIUS_RANGE * 0.5)
    const maxAngle = numRotation * Math.PI * 2 - avgAngleSpacing * metadata.numTiles

    let radius = MIN_RADIUS
    let angle = 0
    let columnX = viewportBounds.left
    let columnY = viewportBounds.top

    let downOffset = 0
    let punchOffset = 0
    let accentOffset = 0

    for (let i = 0; i < metadata.numTiles; i++) {
        // use downscaled tile dimensions to determine layout for
        // both representations, ensuring alignment
        // TODO: investigate tile dims in metadata, shouldn't have to scale tile height by 2
        const { height, width } = metadata.downTiles[i]
        const tileHeight = 2 * TILE_WIDTH * (height / width)
        const tileAngle = tileHeight / radius
        const tileRadius = tileAngle / maxAngle * RADIUS_RANGE

        // check if tile within viewport bounds, wrap to next column if outside
        if (columnY - tileHeight <= viewportBounds.bottom) {
            columnX += TILE_WIDTH + horizontalSpacing
            columnY = viewportBounds.top
        }

        if (shape === 'spiral') {
            addDownscaledSpiralPositions(
                downPositions,
                downOffset,
                radius,
                angle,
                tileRadius,
                tileAngle,
                TILE_WIDTH
            )

            addAccentLineSpiralPositions(
                accentPositions,
                accentOffset,
                radius,
                angle,
                tileRadius,
                tileAngle,
                TILE_WIDTH
            )

            if (viewMode === 'punchcard') {
                addPunchcardSpiralPositions(
                    punchPositions,
                    punchOffset,
                    radius,
                    angle,
                    tileRadius,
                    tileAngle,
                    TILE_WIDTH,
                    metadata.punchNumRows[i]
                )
            }
        } else {
            addDownscaledColumnPositions(
                downPositions,
                downOffset,
                columnX,
                columnY,
                tileHeight,
                TILE_WIDTH
            )

            addAccentLineColumnPositions(
                accentPositions,
                accentOffset,
                columnX,
                columnY,
                tileHeight,
                TILE_WIDTH
            )

            if (viewMode === 'punchcard') {
                addPunchcardColumnPositions(
                    punchPositions,
                    punchOffset,
                    columnX,
                    columnY,
                    tileHeight,
                    TILE_WIDTH,
                    metadata.punchNumRows[i]
                )
            }
        }

        columnY -= tileHeight + verticalSpacing
        angle += tileAngle + (verticalSpacing / radius)
        radius += tileRadius

        downOffset += downFloatPerTile
        punchOffset += punchFloatPerTile(metadata.punchNumRows[i])
        accentOffset += accentFloatPerTile
    }

    const vertexBounds = shape === 'spiral'
        ? {
            left: -radius,
            right: radius,
            top: -radius,
            bottom: radius
        }
        : {
            left: viewportBounds.left,
            right: columnX,
            top: viewportBounds.top,
            bottom: viewportBounds.bottom
        }

    return {
        downPositions,
        punchPositions,
        accentPositions,
        vertexBounds
    }
}

export default CoreRenderer
export {
    POS_FPV,
    TEX_FPV,
    TRANSFORM_SPEED
}
export type {
    CoreViewMode,
    CoreShape
}

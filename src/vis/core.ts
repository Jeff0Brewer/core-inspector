import { mat4 } from 'gl-matrix'
import { clamp, ease, BoundRect } from '../lib/util'
import { TileTextureMetadata } from '../lib/tile-texture'
import { SectionIdMetadata } from '../lib/metadata'
import MineralBlender, { MineralSettings } from '../vis/mineral-blend'
import DownscaledCoreRenderer, {
    addDownscaledPositions,
    addDownscaledTexCoords
} from '../vis/downscaled-core'
import PunchcardCoreRenderer, {
    addPunchcardPositions,
    addPunchcardTexCoords
} from '../vis/punchcard-core'
import StencilCoreRenderer from '../vis/stencil-core'
import HoverHighlightRenderer from '../vis/hover-highlight'

const POS_FPV = 2
const TEX_FPV = 2
const POS_STRIDE = POS_FPV + POS_FPV
const TEX_STRIDE = TEX_FPV

const TRANSFORM_SPEED = 1
const SHAPE_T_MAP = { column: 0, spiral: 1 }

type CoreShape = 'column' | 'spiral'
type CoreViewMode = 'punchcard' | 'downscaled'
type CoreSettings = {
    spacing: [number, number],
    viewMode: CoreViewMode,
    shape: CoreShape,
    pointSize: number,
    hovered: string | undefined
}

class CoreRenderer {
    downRenderer: DownscaledCoreRenderer
    punchRenderer: PunchcardCoreRenderer
    stencilRenderer: StencilCoreRenderer
    highlightRenderer: HoverHighlightRenderer
    metadata: TileTextureMetadata
    numMinerals: number
    currMineral: number
    viewMode: CoreViewMode
    targetShape: CoreShape
    shapeT: number

    constructor (
        gl: WebGLRenderingContext,
        downMineralMaps: Array<HTMLImageElement>,
        punchMineralMaps: Array<HTMLImageElement>,
        tileMetadata: TileTextureMetadata,
        idMetadata: SectionIdMetadata,
        bounds: BoundRect,
        coreSettings: CoreSettings,
        mineralSettings: MineralSettings
    ) {
        const { downTexCoords, punchTexCoords } = getCoreTexCoords(tileMetadata)
        const { downPositions, punchPositions } = getCorePositions(tileMetadata, coreSettings.spacing, bounds)

        const downBlender = new MineralBlender(gl, downMineralMaps)
        const punchBlender = new MineralBlender(gl, punchMineralMaps)
        const defaultBlendMags = Array(downMineralMaps.length).fill(mineralSettings.blendMagnitude)
        downBlender.update(gl, defaultBlendMags)
        punchBlender.update(gl, defaultBlendMags)

        this.downRenderer = new DownscaledCoreRenderer(
            gl,
            downBlender,
            downPositions,
            downTexCoords
        )
        this.punchRenderer = new PunchcardCoreRenderer(
            gl,
            punchBlender,
            punchPositions,
            punchTexCoords,
            coreSettings.pointSize
        )
        this.stencilRenderer = new StencilCoreRenderer(
            gl,
            downPositions,
            tileMetadata,
            idMetadata,
            coreSettings.hovered
        )
        this.highlightRenderer = new HoverHighlightRenderer(gl, downPositions, tileMetadata, idMetadata)

        this.metadata = tileMetadata

        this.currMineral = mineralSettings.index
        this.viewMode = coreSettings.viewMode
        this.targetShape = coreSettings.shape

        this.numMinerals = downMineralMaps.length - 1
        this.shapeT = SHAPE_T_MAP[this.targetShape]
    }

    setHovered (gl: WebGLRenderingContext, id: string | undefined): void {
        this.highlightRenderer.setHovered(gl, id)
        this.stencilRenderer.setHovered(id)
    }

    setShape (shape: CoreShape): void {
        this.targetShape = shape
    }

    setMineral (i: number): void {
        this.currMineral = i
    }

    setViewMode (v: CoreViewMode): void {
        this.viewMode = v
    }

    setBlending (gl: WebGLRenderingContext, magnitudes: Array<number>): void {
        this.downRenderer.minerals.update(gl, magnitudes)
        this.punchRenderer.minerals.update(gl, magnitudes)
    }

    setProj (gl: WebGLRenderingContext, m: mat4): void {
        gl.useProgram(this.downRenderer.program)
        this.downRenderer.setProj(m)

        gl.useProgram(this.punchRenderer.program)
        this.punchRenderer.setProj(m)
        this.punchRenderer.setDpr(window.devicePixelRatio)

        gl.useProgram(this.stencilRenderer.program)
        this.stencilRenderer.setProj(m)

        gl.useProgram(this.highlightRenderer.program)
        this.highlightRenderer.setProj(m)
    }

    setSpacing (
        gl: WebGLRenderingContext,
        spacing: [number, number],
        bounds: BoundRect
    ): void {
        const { downPositions, punchPositions } = getCorePositions(this.metadata, spacing, bounds)
        this.downRenderer.setPositions(gl, downPositions)
        this.punchRenderer.setPositions(gl, punchPositions)
        this.stencilRenderer.setPositions(gl, downPositions)
        this.highlightRenderer.positions = downPositions
    }

    draw (
        gl: WebGLRenderingContext,
        view: mat4,
        elapsed: number,
        mousePos: [number, number],
        setHovered: (id: string | undefined) => void
    ): void {
        const targetShapeT = SHAPE_T_MAP[this.targetShape]
        const incSign = Math.sign(targetShapeT - this.shapeT)
        this.shapeT = clamp(this.shapeT + TRANSFORM_SPEED * elapsed * incSign, 0, 1)
        const easedShapeT = ease(this.shapeT)

        if (this.viewMode === 'downscaled') {
            this.downRenderer.draw(gl, view, this.currMineral, easedShapeT)
        } else {
            this.punchRenderer.draw(gl, view, this.currMineral, easedShapeT)
        }

        this.stencilRenderer.draw(gl, view, easedShapeT, mousePos, setHovered)
        this.highlightRenderer.draw(gl, view, easedShapeT)
    }
}

const BAND_WIDTH = 0.025
const MIN_RADIUS = BAND_WIDTH * 5
const MAX_RADIUS = 1
const RADIUS_RANGE = MAX_RADIUS - MIN_RADIUS

const getCoreTexCoords = (metadata: TileTextureMetadata): {
    downTexCoords: Float32Array,
    punchTexCoords: Float32Array
} => {
    const downCoords: Array<number> = []
    const punchCoords: Array<number> = []

    for (let i = 0; i < metadata.numTiles; i++) {
        addDownscaledTexCoords(
            downCoords,
            metadata.downTiles[i]
        )
        addPunchcardTexCoords(
            punchCoords,
            metadata.punchTiles[i],
            metadata.punchDims[1]
        )
    }

    return {
        downTexCoords: new Float32Array(downCoords),
        punchTexCoords: new Float32Array(punchCoords)
    }
}

// calculate vertices for downsampled and punchcard
// representations at the same time to simplify alignment
const getCorePositions = (metadata: TileTextureMetadata, spacing: [number, number], bounds: BoundRect): {
    downPositions: Float32Array,
    punchPositions: Float32Array
} => {
    const [horizontalSpacing, verticalSpacing] = spacing
    const numRotation = RADIUS_RANGE / (BAND_WIDTH * (1 + horizontalSpacing))
    const avgAngleSpacing = (BAND_WIDTH * verticalSpacing) / (MIN_RADIUS + RADIUS_RANGE * 0.5)
    const maxAngle = numRotation * Math.PI * 2 - avgAngleSpacing * metadata.numTiles

    const downPositions: Array<number> = []
    const punchPositions: Array<number> = []

    let radius = MIN_RADIUS
    let angle = 0
    let colX = bounds.left
    let colY = bounds.top

    for (let i = 0; i < metadata.numTiles; i++) {
        const downRect = metadata.downTiles[i]
        const punchRect = metadata.punchTiles[i]

        // TODO: investigate tile dims in metadata, shouldn't have to scale tile
        // height by 2
        const tileHeight = 2 * BAND_WIDTH * (downRect.height / downRect.width)
        const tileAngle = tileHeight / radius
        const tileRadius = tileAngle / maxAngle * RADIUS_RANGE

        if (colY - tileHeight <= bounds.bottom) {
            colX += BAND_WIDTH * (1 + horizontalSpacing)
            colY = bounds.top
        }

        addDownscaledPositions(
            downPositions,
            radius,
            angle,
            colX,
            colY,
            tileRadius,
            tileAngle,
            tileHeight,
            BAND_WIDTH
        )

        addPunchcardPositions(
            punchPositions,
            punchRect,
            radius,
            angle,
            colX,
            colY,
            tileRadius,
            tileAngle,
            tileHeight,
            BAND_WIDTH,
            metadata.punchDims[1]
        )

        colY -= tileHeight + BAND_WIDTH * verticalSpacing
        angle += tileAngle + (BAND_WIDTH * verticalSpacing) / radius
        radius += tileRadius
    }

    // TODO: fix this temporary and inefficient spacing adjustment
    if (colX < bounds.right) {
        const colXPad = 0.5 * (bounds.right - colX)
        const colXOffset = POS_FPV
        for (let i = colXOffset; i < downPositions.length; i += POS_STRIDE) {
            downPositions[i] += colXPad
        }
        for (let i = colXOffset; i < punchPositions.length; i += POS_STRIDE) {
            punchPositions[i] += colXPad
        }
    }

    return {
        downPositions: new Float32Array(downPositions),
        punchPositions: new Float32Array(punchPositions)
    }
}

export default CoreRenderer
export { POS_FPV, TEX_FPV, POS_STRIDE, TEX_STRIDE }
export type {
    CoreViewMode,
    CoreShape,
    CoreSettings
}

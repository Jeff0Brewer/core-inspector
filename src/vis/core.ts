import { mat4 } from 'gl-matrix'
import { clamp, BoundRect } from '../lib/util'
import { TileTextureMetadata } from '../lib/tile-texture'
import MineralBlender, { MineralSettings } from '../vis/mineral-blend'
import DownscaledCoreRenderer, {
    addDownscaledPositions,
    addDownscaledTexCoords
} from '../vis/downscaled-core'
import PunchcardCoreRenderer, {
    addPunchcardPositions,
    addPunchcardTexCoords
} from '../vis/punchcard-core'

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
    pointSize: number
}

class CoreRenderer {
    downRenderer: DownscaledCoreRenderer
    punchRenderer: PunchcardCoreRenderer
    downMetadata: TileTextureMetadata
    punchMetadata: TileTextureMetadata
    numMinerals: number
    currMineral: number
    viewMode: CoreViewMode
    targetShape: CoreShape
    shapeT: number

    constructor (
        gl: WebGLRenderingContext,
        downMineralMaps: Array<HTMLImageElement>,
        downMetadata: TileTextureMetadata,
        punchMineralMaps: Array<HTMLImageElement>,
        punchMetadata: TileTextureMetadata,
        bounds: BoundRect,
        coreSettings: CoreSettings,
        mineralSettings: MineralSettings
    ) {
        if (downMetadata.numTiles !== punchMetadata.numTiles) {
            throw new Error('Downscaled and punchcard tile textures contain different tiles')
        }

        const { downPositions, downTexCoords, punchPositions, punchTexCoords } = getCoreVerts(
            downMetadata,
            punchMetadata,
            coreSettings.spacing,
            bounds
        )
        const downBlender = new MineralBlender(gl, downMineralMaps)
        const punchBlender = new MineralBlender(gl, punchMineralMaps)
        const defaultBlendMags = Array(downMineralMaps.length).fill(mineralSettings.blendMagnitude)
        downBlender.update(gl, defaultBlendMags)
        punchBlender.update(gl, defaultBlendMags)

        this.downRenderer = new DownscaledCoreRenderer(gl, downBlender, downPositions, downTexCoords)
        this.punchRenderer = new PunchcardCoreRenderer(gl, punchBlender, punchPositions, punchTexCoords)

        this.downMetadata = downMetadata
        this.punchMetadata = punchMetadata

        this.currMineral = mineralSettings.index
        this.viewMode = coreSettings.viewMode
        this.targetShape = coreSettings.shape

        this.numMinerals = downMineralMaps.length - 1
        this.shapeT = SHAPE_T_MAP[this.targetShape]
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

    setProj (gl: WebGLRenderingContext, m: mat4): void {
        gl.useProgram(this.downRenderer.program)
        this.downRenderer.setProj(m)

        gl.useProgram(this.punchRenderer.program)
        this.punchRenderer.setProj(m)
        this.punchRenderer.setDpr(window.devicePixelRatio)
    }

    setView (gl: WebGLRenderingContext, m: mat4): void {
        gl.useProgram(this.downRenderer.program)
        this.downRenderer.setView(m)

        gl.useProgram(this.punchRenderer.program)
        this.punchRenderer.setView(m)
    }

    setBlending (gl: WebGLRenderingContext, magnitudes: Array<number>): void {
        this.downRenderer.minerals.update(gl, magnitudes)
        this.punchRenderer.minerals.update(gl, magnitudes)
    }

    setSpacing (
        gl: WebGLRenderingContext,
        spacing: [number, number],
        bounds: BoundRect
    ): void {
        const { downPositions, punchPositions } = getCoreVerts(
            this.downMetadata,
            this.punchMetadata,
            spacing,
            bounds
        )
        this.downRenderer.setPositions(gl, downPositions)
        this.punchRenderer.setPositions(gl, punchPositions)
    }

    draw (gl: WebGLRenderingContext, elapsed: number): void {
        const targetShapeT = SHAPE_T_MAP[this.targetShape]
        const incSign = Math.sign(targetShapeT - this.shapeT)
        this.shapeT = clamp(this.shapeT + TRANSFORM_SPEED * elapsed * incSign, 0, 1)

        if (this.viewMode === 'downscaled') {
            this.downRenderer.draw(gl, this.currMineral, this.shapeT)
        } else {
            this.punchRenderer.draw(gl, this.currMineral, this.shapeT)
        }
    }
}

const BAND_WIDTH = 0.025
const MIN_RADIUS = BAND_WIDTH * 5
const MAX_RADIUS = 1
const RADIUS_RANGE = MAX_RADIUS - MIN_RADIUS

// calculate vertices for downsampled and punchcard
// representations at the same time to simplify alignment
const getCoreVerts = (
    downMetadata: TileTextureMetadata,
    punchMetadata: TileTextureMetadata,
    spacing: [number, number],
    bounds: BoundRect
): {
    downPositions: Float32Array,
    downTexCoords: Float32Array,
    punchPositions: Float32Array,
    punchTexCoords: Float32Array,
} => {
    const [horizontalSpacing, verticalSpacing] = spacing
    const numRotation = RADIUS_RANGE / (BAND_WIDTH * (1 + horizontalSpacing))
    const avgAngleSpacing = (BAND_WIDTH * verticalSpacing) / (MIN_RADIUS + RADIUS_RANGE * 0.5)
    const maxAngle = numRotation * Math.PI * 2 - avgAngleSpacing * downMetadata.numTiles

    const downPositions: Array<number> = []
    const downTexCoords: Array<number> = []

    const punchPositions: Array<number> = []
    const punchTexCoords: Array<number> = []

    let radius = MIN_RADIUS
    let angle = 0
    let colX = bounds.left
    let colY = bounds.top

    for (let i = 0; i < downMetadata.numTiles; i++) {
        const downRect = downMetadata.tiles[i]
        const punchRect = punchMetadata.tiles[i]

        const tileHeight = BAND_WIDTH * (downRect.height / downRect.width)
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
        addDownscaledTexCoords(
            downTexCoords,
            downRect
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
            punchMetadata.textureHeight
        )
        addPunchcardTexCoords(
            punchTexCoords,
            punchRect,
            punchMetadata.textureHeight
        )

        colY -= tileHeight + BAND_WIDTH * verticalSpacing
        angle += tileAngle + (BAND_WIDTH * verticalSpacing) / radius
        radius += tileRadius
    }

    // pad x position if full width not filled
    if (colX < bounds.right) {
        const colXPad = 0.5 * (bounds.right - colX)

        // skip spiral position attrib to get offset of column x position
        const colXOffset = POS_FPV

        // adjust column x positions to center tiles in viewport
        for (let i = colXOffset; i < downPositions.length; i += POS_STRIDE) {
            downPositions[i] += colXPad
        }
        for (let i = colXOffset; i < punchPositions.length; i += POS_STRIDE) {
            punchPositions[i] += colXPad
        }
    }

    return {
        downPositions: new Float32Array(downPositions),
        downTexCoords: new Float32Array(downTexCoords),
        punchPositions: new Float32Array(punchPositions),
        punchTexCoords: new Float32Array(punchTexCoords)
    }
}

export default CoreRenderer
export { POS_FPV, TEX_FPV, POS_STRIDE, TEX_STRIDE }
export type {
    CoreViewMode,
    CoreShape,
    CoreSettings
}

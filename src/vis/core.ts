import { mat4 } from 'gl-matrix'
import { clamp } from '../lib/util'
import { TileTextureMetadata } from '../lib/tile-texture'
import DownscaledCoreRenderer, { addDownscaledTile } from '../vis/downscaled-core'
import PunchcardCoreRenderer, { addPunchcardTile } from '../vis/punchcard-core'

const TRANSFORM_SPEED = 1
const SHAPE_T_MAP = { column: 0, spiral: 1 }

type CoreShape = 'column' | 'spiral'
type CoreViewMode = 'punchcard' | 'downscaled'

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
    setProj: (m: mat4) => void
    setView: (m: mat4) => void

    constructor (
        gl: WebGLRenderingContext,
        downMineralMaps: Array<HTMLImageElement>,
        downMetadata: TileTextureMetadata,
        punchMineralMaps: Array<HTMLImageElement>,
        punchMetadata: TileTextureMetadata
    ) {
        if (downMetadata.numTiles !== punchMetadata.numTiles) {
            throw new Error('Downscaled and punchcard tile textures contain different tiles')
        }

        const { downVerts, punchVerts } = getCoreVerts(downMetadata, punchMetadata, 0.5, 0.5)
        this.downRenderer = new DownscaledCoreRenderer(gl, downMineralMaps, downVerts)
        this.punchRenderer = new PunchcardCoreRenderer(gl, punchMineralMaps, punchVerts)
        this.downMetadata = downMetadata
        this.punchMetadata = punchMetadata

        this.setProj = (m: mat4): void => {
            gl.useProgram(this.downRenderer.program)
            this.downRenderer.setProj(m)
            gl.useProgram(this.punchRenderer.program)
            this.punchRenderer.setProj(m)
            this.punchRenderer.setDpr(window.devicePixelRatio)
        }

        this.setView = (m: mat4): void => {
            gl.useProgram(this.downRenderer.program)
            this.downRenderer.setView(m)
            gl.useProgram(this.punchRenderer.program)
            this.punchRenderer.setView(m)
        }

        this.currMineral = 0
        this.numMinerals = downMineralMaps.length - 1

        this.viewMode = 'downscaled'
        this.targetShape = 'column'
        this.shapeT = SHAPE_T_MAP[this.targetShape]
    }

    setBlending (gl: WebGLRenderingContext, magnitudes: Array<number>): void {
        this.downRenderer.textureBlender.update(gl, magnitudes)
        this.punchRenderer.textureBlender.update(gl, magnitudes)
    }

    setSpacing (gl: WebGLRenderingContext, horizontal: number, vertical: number): void {
        const { downVerts, punchVerts } = getCoreVerts(
            this.downMetadata,
            this.punchMetadata,
            horizontal,
            vertical
        )
        this.downRenderer.setVerts(gl, downVerts)
        this.punchRenderer.setVerts(gl, punchVerts)
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

const getCoreVerts = (
    downMetadata: TileTextureMetadata,
    punchMetadata: TileTextureMetadata,
    horizontalSpacing: number,
    verticalSpacing: number
): {
    downVerts: Float32Array,
    punchVerts: Float32Array
} => {
    const numRotation = RADIUS_RANGE / (BAND_WIDTH * (1 + horizontalSpacing))
    const avgAngleSpacing = (BAND_WIDTH * verticalSpacing) / (MIN_RADIUS + RADIUS_RANGE * 0.5)
    const maxAngle = numRotation * Math.PI * 2 - avgAngleSpacing * downMetadata.numTiles

    const downVerts: Array<number> = []
    const punchVerts: Array<number> = []

    let radius = MIN_RADIUS
    let angle = 0
    let colX = -1
    let colY = 1

    for (let i = 0; i < downMetadata.numTiles; i++) {
        const downRect = downMetadata.tiles[i]
        const punchRect = punchMetadata.tiles[i]

        const tileHeight = BAND_WIDTH * (downRect.height / downRect.width)
        const tileAngle = tileHeight / radius
        const tileRadius = tileAngle / maxAngle * RADIUS_RANGE

        if (colY - tileHeight <= -1) {
            colX += BAND_WIDTH * (1 + horizontalSpacing)
            colY = 1
        }

        addDownscaledTile(
            downVerts,
            downRect,
            radius,
            angle,
            colX,
            colY,
            tileRadius,
            tileAngle,
            tileHeight,
            BAND_WIDTH
        )

        addPunchcardTile(
            punchVerts,
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

        colY -= tileHeight + BAND_WIDTH * verticalSpacing
        angle += tileAngle + (BAND_WIDTH * verticalSpacing) / radius
        radius += tileRadius
    }

    return {
        downVerts: new Float32Array(downVerts),
        punchVerts: new Float32Array(punchVerts)
    }
}

export default CoreRenderer
export type {
    CoreViewMode,
    CoreShape
}

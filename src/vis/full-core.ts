import { mat4 } from 'gl-matrix'
import { clamp } from '../lib/util'
import { TileTextureMetadata } from '../lib/tile-texture'
import TexMappedCoreRenderer, { addTexTile } from '../vis/tex-full-core'
import PunchcardCoreRenderer, { addPunchTile } from '../vis/punch-full-core'

const TRANSFORM_SPEED = 1
const SHAPE_T_MAP = { column: 0, spiral: 1 }

type FullCoreShape = 'column' | 'spiral'
type FullCoreViewMode = 'punchcard' | 'downscaled'

class FullCoreRenderer {
    texRenderer: TexMappedCoreRenderer
    punchRenderer: PunchcardCoreRenderer
    texMetadata: TileTextureMetadata
    punchMetadata: TileTextureMetadata
    numMinerals: number
    currMineral: number
    viewMode: FullCoreViewMode
    targetShape: FullCoreShape
    shapeT: number
    setProj: (m: mat4) => void
    setView: (m: mat4) => void

    constructor (
        gl: WebGLRenderingContext,
        texMineralMaps: Array<HTMLImageElement>,
        texMetadata: TileTextureMetadata,
        punchMineralMaps: Array<HTMLImageElement>,
        punchMetadata: TileTextureMetadata
    ) {
        if (texMetadata.numTiles !== punchMetadata.numTiles) {
            throw new Error('Downscaled and punchcard tile textures contain different tiles')
        }

        const { texVerts, punchVerts } = getFullCoreVerts(texMetadata, punchMetadata, 0.5, 0.5)
        this.texRenderer = new TexMappedCoreRenderer(gl, texMineralMaps, texVerts)
        this.punchRenderer = new PunchcardCoreRenderer(gl, punchMineralMaps, punchVerts)
        this.texMetadata = texMetadata
        this.punchMetadata = punchMetadata

        this.setProj = (m: mat4): void => {
            gl.useProgram(this.texRenderer.program)
            this.texRenderer.setProj(m)
            gl.useProgram(this.punchRenderer.program)
            this.punchRenderer.setProj(m)
            this.punchRenderer.setDpr(window.devicePixelRatio)
        }

        this.setView = (m: mat4): void => {
            gl.useProgram(this.texRenderer.program)
            this.texRenderer.setView(m)
            gl.useProgram(this.punchRenderer.program)
            this.punchRenderer.setView(m)
        }

        this.currMineral = 0
        this.numMinerals = texMineralMaps.length - 1

        this.viewMode = 'downscaled'
        this.targetShape = 'column'
        this.shapeT = SHAPE_T_MAP[this.targetShape]
    }

    setBlending (gl: WebGLRenderingContext, magnitudes: Array<number>): void {
        this.texRenderer.textureBlender.update(gl, magnitudes)
        this.punchRenderer.textureBlender.update(gl, magnitudes)
    }

    setSpacing (gl: WebGLRenderingContext, horizontal: number, vertical: number): void {
        const { texVerts, punchVerts } = getFullCoreVerts(
            this.texMetadata,
            this.punchMetadata,
            horizontal,
            vertical
        )
        this.texRenderer.setVerts(gl, texVerts)
        this.punchRenderer.setVerts(gl, punchVerts)
    }

    setShape (shape: FullCoreShape): void {
        this.targetShape = shape
    }

    setCurrMineral (i: number): void {
        this.currMineral = i
    }

    setViewMode (v: FullCoreViewMode): void {
        this.viewMode = v
    }

    draw (gl: WebGLRenderingContext, elapsed: number): void {
        const targetShapeT = SHAPE_T_MAP[this.targetShape]
        const incSign = Math.sign(targetShapeT - this.shapeT)
        this.shapeT = clamp(this.shapeT + TRANSFORM_SPEED * elapsed * incSign, 0, 1)

        if (this.viewMode === 'downscaled') {
            this.texRenderer.draw(gl, this.currMineral, this.shapeT)
        } else {
            this.punchRenderer.draw(gl, this.currMineral, this.shapeT)
        }
    }
}

const BAND_WIDTH = 0.025
const MIN_RADIUS = BAND_WIDTH * 5
const MAX_RADIUS = 1
const RADIUS_RANGE = MAX_RADIUS - MIN_RADIUS

const getFullCoreVerts = (
    texMetadata: TileTextureMetadata,
    punchMetadata: TileTextureMetadata,
    horizontalSpacing: number,
    verticalSpacing: number
): {
    texVerts: Float32Array,
    punchVerts: Float32Array
} => {
    const numRotation = RADIUS_RANGE / (BAND_WIDTH * (1 + horizontalSpacing))
    const avgAngleSpacing = (BAND_WIDTH * verticalSpacing) / (MIN_RADIUS + RADIUS_RANGE * 0.5)
    const maxAngle = numRotation * Math.PI * 2 - avgAngleSpacing * texMetadata.numTiles

    const texVerts: Array<number> = []
    const punchVerts: Array<number> = []

    let radius = MIN_RADIUS
    let angle = 0
    let colX = -1
    let colY = 1

    for (let i = 0; i < texMetadata.numTiles; i++) {
        const texRect = texMetadata.tiles[i]
        const punchRect = punchMetadata.tiles[i]

        const tileHeight = BAND_WIDTH * (texRect.height / texRect.width)
        const tileAngle = tileHeight / radius
        const tileRadius = tileAngle / maxAngle * RADIUS_RANGE

        if (colY - tileHeight <= -1) {
            colX += BAND_WIDTH * (1 + horizontalSpacing)
            colY = 1
        }

        addTexTile(
            texVerts,
            texRect,
            radius,
            angle,
            colX,
            colY,
            tileRadius,
            tileAngle,
            tileHeight,
            BAND_WIDTH
        )

        addPunchTile(
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
        texVerts: new Float32Array(texVerts),
        punchVerts: new Float32Array(punchVerts)
    }
}

export default FullCoreRenderer
export type {
    FullCoreViewMode,
    FullCoreShape
}

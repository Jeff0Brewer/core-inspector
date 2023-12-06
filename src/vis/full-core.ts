import { mat4 } from 'gl-matrix'
import { clamp } from '../lib/util'
import { TileTextureMetadata } from '../lib/tile-texture'
import TexMappedCoreRenderer, { addTexTile } from '../vis/tex-full-core'
import PunchcardCoreRenderer, { addPunchTile } from '../vis/punch-full-core'

const TRANSFORM_SPEED = 1
const BAND_WIDTH = 0.025
const MIN_RADIUS = BAND_WIDTH * 5
const MAX_RADIUS = 1
const RADIUS_RANGE = MAX_RADIUS - MIN_RADIUS

const COLUMN_SHAPE = 0
const SPIRAL_SHAPE = 1

class FullCoreRenderer {
    texRenderer: TexMappedCoreRenderer
    punchRenderer: PunchcardCoreRenderer
    setProj: (m: mat4) => void
    setView: (m: mat4) => void
    currMineral: number
    numMinerals: number
    targetShape: number
    currShape: number

    constructor (
        gl: WebGLRenderingContext,
        texMineralMaps: Array<HTMLImageElement>,
        texMetadata: TileTextureMetadata,
        punchMineralMaps: Array<HTMLImageElement>,
        punchMetadata: TileTextureMetadata
    ) {
        if (texMetadata.numTiles !== punchMetadata.numTiles) {
            throw new Error('Texture mapped and punchcard tile textures contain different tiles')
        }
        this.currMineral = 0
        this.numMinerals = texMineralMaps.length - 1

        const { texVerts, punchVerts } = getFullCoreVerts(texMetadata, punchMetadata, 0.5, 0.5)
        this.texRenderer = new TexMappedCoreRenderer(gl, texMineralMaps, texVerts)
        this.punchRenderer = new PunchcardCoreRenderer(gl, punchMineralMaps, punchVerts)

        this.setProj = (m: mat4): void => {
            gl.useProgram(this.texRenderer.program)
            this.texRenderer.setProj(m)
            gl.useProgram(this.punchRenderer.program)
            this.punchRenderer.setProj(m)
        }

        this.setView = (m: mat4): void => {
            gl.useProgram(this.texRenderer.program)
            this.texRenderer.setView(m)
            gl.useProgram(this.punchRenderer.program)
            this.punchRenderer.setView(m)
        }

        this.targetShape = COLUMN_SHAPE
        this.currShape = COLUMN_SHAPE
    }

    setShape (t: number): void {
        this.targetShape = clamp(Math.round(t), 0, 1)
    }

    setCurrMineral (i: number): void {
        this.currMineral = clamp(i, 0, this.numMinerals)
    }

    draw (gl: WebGLRenderingContext, elapsed: number): void {
        const incSign = Math.sign(this.targetShape - this.currShape)
        this.currShape = clamp(this.currShape + TRANSFORM_SPEED * elapsed * incSign, 0, 1)

        this.texRenderer.draw(gl, this.currMineral, this.currShape)
        this.punchRenderer.draw(gl, this.currMineral, this.currShape)
    }
}

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
export {
    COLUMN_SHAPE,
    SPIRAL_SHAPE
}

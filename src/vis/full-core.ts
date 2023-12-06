import { mat4 } from 'gl-matrix'
import { initProgram, initBuffer, initAttribute, initTexture } from '../lib/gl-wrap'
import { TileTextureMetadata, TileCoords } from '../lib/tile-texture'
import texVert from '../shaders/full-core-vert.glsl?raw'
import texFrag from '../shaders/full-core-frag.glsl?raw'
import punchVert from '../shaders/punchcard-vert.glsl?raw'
import punchFrag from '../shaders/punchcard-frag.glsl?raw'

const POS_FPV = 2
const TEX_FPV = 2
const STRIDE = POS_FPV + POS_FPV + TEX_FPV

const TRANSFORM_SPEED = 1

class TexMappedCoreRenderer {
    program: WebGLProgram
    buffer: WebGLBuffer
    minerals: Array<WebGLTexture>
    numVertex: number
    bindAttrib: () => void
    setProj: (m: mat4) => void
    setView: (m: mat4) => void
    setShapeT: (t: number) => void

    constructor (
        gl: WebGLRenderingContext,
        mineralMaps: Array<HTMLImageElement>,
        vertices: Float32Array
    ) {
        this.program = initProgram(gl, texVert, texFrag)

        this.numVertex = vertices.length / STRIDE
        this.buffer = initBuffer(gl)
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)

        this.minerals = []
        for (const img of mineralMaps) {
            const texture = initTexture(gl)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, gl.LUMINANCE, gl.UNSIGNED_BYTE, img)
            this.minerals.push(texture)
        }

        const bindSpiralPos = initAttribute(gl, this.program, 'spiralPos', POS_FPV, STRIDE, 0)
        const bindColumnPos = initAttribute(gl, this.program, 'columnPos', POS_FPV, STRIDE, POS_FPV)
        const bindTexCoord = initAttribute(gl, this.program, 'texCoord', TEX_FPV, STRIDE, 2 * POS_FPV)
        this.bindAttrib = (): void => {
            bindSpiralPos()
            bindColumnPos()
            bindTexCoord()
        }

        const projLoc = gl.getUniformLocation(this.program, 'proj')
        this.setProj = (m: mat4): void => { gl.uniformMatrix4fv(projLoc, false, m) }

        const viewLoc = gl.getUniformLocation(this.program, 'view')
        this.setView = (m: mat4): void => { gl.uniformMatrix4fv(viewLoc, false, m) }

        const shapeTLoc = gl.getUniformLocation(this.program, 'shapeT')
        this.setShapeT = (t: number): void => { gl.uniform1f(shapeTLoc, t) }
    }

    draw (gl: WebGLRenderingContext, currMineral: number, shapeT: number): void {
        gl.useProgram(this.program)

        gl.bindTexture(gl.TEXTURE_2D, this.minerals[currMineral])
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer)
        this.bindAttrib()
        this.setShapeT(ease(shapeT))

        gl.drawArrays(gl.TRIANGLES, 0, this.numVertex)
    }
}

class PunchcardCoreRenderer {
    program: WebGLProgram
    buffer: WebGLBuffer
    numVertex: number
    minerals: Array<WebGLTexture>
    bindAttrib: () => void
    setProj: (m: mat4) => void
    setView: (m: mat4) => void
    setShapeT: (t: number) => void

    constructor (
        gl: WebGLRenderingContext,
        mineralMaps: Array<HTMLImageElement>,
        vertices: Float32Array
    ) {
        this.program = initProgram(gl, punchVert, punchFrag)

        this.numVertex = vertices.length / STRIDE
        this.buffer = initBuffer(gl)
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)

        this.minerals = []
        for (const img of mineralMaps) {
            const texture = initTexture(gl)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, gl.LUMINANCE, gl.UNSIGNED_BYTE, img)
            this.minerals.push(texture)
        }

        const bindSpiralPos = initAttribute(gl, this.program, 'spiralPos', POS_FPV, STRIDE, 0)
        const bindColumnPos = initAttribute(gl, this.program, 'columnPos', POS_FPV, STRIDE, POS_FPV)
        const bindTexCoord = initAttribute(gl, this.program, 'texCoord', TEX_FPV, STRIDE, 2 * POS_FPV)
        this.bindAttrib = (): void => {
            bindSpiralPos()
            bindColumnPos()
            bindTexCoord()
        }

        const projLoc = gl.getUniformLocation(this.program, 'proj')
        this.setProj = (m: mat4): void => { gl.uniformMatrix4fv(projLoc, false, m) }

        const viewLoc = gl.getUniformLocation(this.program, 'view')
        this.setView = (m: mat4): void => { gl.uniformMatrix4fv(viewLoc, false, m) }

        const shapeTLoc = gl.getUniformLocation(this.program, 'shapeT')
        this.setShapeT = (t: number): void => { gl.uniform1f(shapeTLoc, t) }
    }

    draw (gl: WebGLRenderingContext, currMineral: number, shapeT: number): void {
        gl.useProgram(this.program)

        gl.bindTexture(gl.TEXTURE_2D, this.minerals[currMineral])
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer)
        this.bindAttrib()
        this.setShapeT(ease(shapeT))

        gl.drawArrays(gl.POINTS, 0, this.numVertex)
    }
}

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
        this.numMinerals = texMineralMaps.length

        const { texVerts, punchVerts } = getFullCoreVerts(texMetadata, punchMetadata, 0.5, 0.6, punchMineralMaps[0].height)
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

        this.targetShape = 1
        this.currShape = 1
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

const TILE_DETAIL = 20
const BAND_WIDTH = 0.025
const MIN_RADIUS = BAND_WIDTH * 5
const MAX_RADIUS = 1
const RADIUS_RANGE = MAX_RADIUS - MIN_RADIUS

const addTexTile = (
    out: Array<number>,
    coords: TileCoords,
    currRadius: number,
    currAngle: number,
    currColX: number,
    currColY: number,
    tileRadius: number,
    tileAngle: number,
    tileHeight: number
): void => {
    const angleInc = tileAngle / TILE_DETAIL
    const radiusInc = tileRadius / TILE_DETAIL
    const yInc = coords.height / TILE_DETAIL
    const colYInc = tileHeight / TILE_DETAIL

    let angle = currAngle
    let radius = currRadius
    const colX = currColX
    let colY = currColY

    let i = 0
    while (i < TILE_DETAIL) {
        const inner = [
            Math.cos(angle) * (radius - BAND_WIDTH * 0.5),
            Math.sin(angle) * (radius - BAND_WIDTH * 0.5),
            colX,
            colY,
            coords.left,
            coords.top + yInc * i
        ]

        const outer = [
            Math.cos(angle) * (radius + BAND_WIDTH * 0.5),
            Math.sin(angle) * (radius + BAND_WIDTH * 0.5),
            colX + BAND_WIDTH,
            colY,
            coords.left + coords.width,
            coords.top + yInc * i
        ]

        i += 1
        radius += radiusInc
        angle += angleInc
        colY -= colYInc

        const nextInner = [
            Math.cos(angle) * (radius - BAND_WIDTH * 0.5),
            Math.sin(angle) * (radius - BAND_WIDTH * 0.5),
            colX,
            colY,
            coords.left,
            coords.top + yInc * i
        ]

        const nextOuter = [
            Math.cos(angle) * (radius + BAND_WIDTH * 0.5),
            Math.sin(angle) * (radius + BAND_WIDTH * 0.5),
            colX + BAND_WIDTH,
            colY,
            coords.left + coords.width,
            coords.top + yInc * i
        ]

        out.push(
            ...inner,
            ...outer,
            ...nextOuter,
            ...nextOuter,
            ...nextInner,
            ...inner
        )
    }
}

const addPunchTile = (
    out: Array<number>,
    coords: TileCoords,
    currRadius: number,
    currAngle: number,
    currColX: number,
    currColY: number,
    tileRadius: number,
    tileAngle: number,
    tileHeight: number,
    textureHeight: number
): void => {
    const numRows = Math.round(coords.height * textureHeight)
    const angleInc = tileAngle / numRows
    const radiusInc = tileRadius / numRows
    const colYInc = tileHeight / numRows

    const colX = currColX
    let colY = currColY

    let radius = currRadius
    let angle = currAngle
    for (let i = 0; i < numRows; i++, radius += radiusInc, angle += angleInc, colY -= colYInc) {
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)
        const startRadius = radius - BAND_WIDTH * 0.5
        for (let p = 0; p < 3; p++) {
            const bandAcross = BAND_WIDTH * (p + 0.5) / 3
            out.push(
                cos * (startRadius + bandAcross),
                sin * (startRadius + bandAcross),
                colX + bandAcross,
                colY,
                coords.left + coords.width * p / 3,
                coords.top + coords.height * i / numRows
            )
        }
    }
}

const getFullCoreVerts = (
    texMetadata: TileTextureMetadata,
    punchMetadata: TileTextureMetadata,
    verticalSpacing: number,
    horizontalSpacing: number,
    tempTextureHeight: number
): {
    texVerts: Float32Array,
    punchVerts: Float32Array
} => {
    const numTiles = texMetadata.tiles.length

    const numRotation = RADIUS_RANGE / (BAND_WIDTH * (1 + horizontalSpacing))
    const maxAngle = numRotation * Math.PI * 2

    let radius = MIN_RADIUS
    let angle = 0
    let colX = -1
    let colY = 1

    const texVerts: Array<number> = []
    const punchVerts: Array<number> = []

    for (let i = 0; i < numTiles; i++) {
        const texCoords = texMetadata.tiles[i]
        const punchCoords = punchMetadata.tiles[i]

        const heightPer = texCoords.height / texMetadata.totalHeight
        const tileRadius = heightPer * RADIUS_RANGE
        const tileAngle = heightPer * maxAngle

        const tileHeight = BAND_WIDTH * (texCoords.height / texCoords.width)

        if (colY - tileHeight <= -1) {
            colX += BAND_WIDTH * (1 + horizontalSpacing)
            colY = 1
        }

        addTexTile(
            texVerts,
            texCoords,
            radius,
            angle,
            colX,
            colY,
            tileRadius,
            tileAngle,
            tileHeight
        )

        addPunchTile(
            punchVerts,
            punchCoords,
            radius,
            angle,
            colX,
            colY,
            tileRadius,
            tileAngle,
            tileHeight,
            tempTextureHeight
        )

        colY -= tileHeight + BAND_WIDTH * verticalSpacing
        angle += tileAngle + BAND_WIDTH * verticalSpacing
        radius += tileRadius
    }

    return {
        texVerts: new Float32Array(texVerts),
        punchVerts: new Float32Array(punchVerts)
    }
}

const ease = (t: number): number => {
    const t2 = t * t
    return t2 / (2 * (t2 - t) + 1)
}

const clamp = (v: number, min: number, max: number): number => {
    return Math.max(Math.min(v, max), min)
}

export default FullCoreRenderer

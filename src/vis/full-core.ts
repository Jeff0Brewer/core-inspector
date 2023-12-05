import { mat4 } from 'gl-matrix'
import { initProgram, initBuffer, initAttribute, initTexture } from '../lib/gl-wrap'
import { TileTextureMetadata, TileCoords } from '../lib/tile-texture'
import vertSource from '../shaders/full-core-vert.glsl?raw'
import fragSource from '../shaders/full-core-frag.glsl?raw'

const POS_FPV = 2
const TEX_FPV = 2
const STRIDE = POS_FPV + POS_FPV + TEX_FPV

const TRANSFORM_SPEED = 1

class FullCoreRenderer {
    program: WebGLProgram
    buffer: WebGLBuffer
    minerals: Array<WebGLTexture>
    bindAttrib: () => void
    setProj: (m: mat4) => void
    setView: (m: mat4) => void
    setShapeT: (t: number) => void
    targetShape: number
    shapeT: number
    currMineral: number
    numVertex: number

    constructor (
        gl: WebGLRenderingContext,
        mineralMaps: Array<HTMLImageElement>,
        metadata: TileTextureMetadata
    ) {
        this.program = initProgram(gl, vertSource, fragSource)

        const verts = getFullCoreVerts(metadata, 20, 0.3)
        this.numVertex = verts.length / STRIDE

        this.buffer = initBuffer(gl)
        gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW)

        this.minerals = []
        for (let i = 0; i < mineralMaps.length; i++) {
            const texture = initTexture(gl)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, gl.LUMINANCE, gl.UNSIGNED_BYTE, mineralMaps[i])
            this.minerals.push(texture)
        }
        this.currMineral = 0

        const bindSpiralPos = initAttribute(gl, this.program, 'spiralPos', POS_FPV, STRIDE, 0)
        const bindColumnPos = initAttribute(gl, this.program, 'columnPos', POS_FPV, STRIDE, POS_FPV)
        const bindTexCoord = initAttribute(gl, this.program, 'texCoord', TEX_FPV, STRIDE, 2 * POS_FPV)
        this.bindAttrib = (): void => {
            bindSpiralPos()
            bindColumnPos()
            bindTexCoord()
        }

        const projLoc = gl.getUniformLocation(this.program, 'proj')
        this.setProj = (m: mat4): void => {
            gl.useProgram(this.program)
            gl.uniformMatrix4fv(projLoc, false, m)
        }

        const viewLoc = gl.getUniformLocation(this.program, 'view')
        this.setView = (m: mat4): void => {
            gl.useProgram(this.program)
            gl.uniformMatrix4fv(viewLoc, false, m)
        }

        this.targetShape = 1
        this.shapeT = 1
        const shapeTLoc = gl.getUniformLocation(this.program, 'shapeT')
        this.setShapeT = (t: number): void => {
            gl.useProgram(this.program)
            gl.uniform1f(shapeTLoc, t)
        }
    }

    setCurrMineral (i: number): void {
        this.currMineral = clamp(i, 0, this.minerals.length - 1)
    }

    draw (gl: WebGLRenderingContext, elapsed: number): void {
        gl.useProgram(this.program)

        gl.bindTexture(gl.TEXTURE_2D, this.minerals[this.currMineral])
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer)
        this.bindAttrib()

        const incSign = Math.sign(this.targetShape - this.shapeT)
        this.shapeT = clamp(this.shapeT + TRANSFORM_SPEED * elapsed * incSign, 0, 1)
        this.setShapeT(ease(this.shapeT))

        gl.drawArrays(gl.TRIANGLES, 0, this.numVertex)
    }
}

const getFullCoreVerts = (
    metadata: TileTextureMetadata,
    segmentDetail: number,
    spacing: number
): Float32Array => {
    const bandWidth = 0.025
    const minRadius = bandWidth * 5
    const maxRadius = 1
    const numRotation = Math.ceil((maxRadius - minRadius) / (bandWidth * (1 + spacing)))
    const maxAngle = Math.PI * 2 * numRotation

    const totalHeight = metadata.tiles
        .map(coord => coord.bottom - coord.top)
        .reduce((t, c) => t + c, 0)
    const heightToAngle = maxAngle / totalHeight
    const heightToRadius = (maxRadius - minRadius) / totalHeight

    let radius = minRadius
    let angle = 0
    let colX = -1
    let colY = 1

    const verts: Array<number> = []
    const addSegment = (coords: TileCoords): void => {
        const segmentHeight = (coords.bottom - coords.top)
        const heightInc = segmentHeight / segmentDetail

        const segmentWidth = (coords.right - coords.left)
        const colHeight = bandWidth * (segmentHeight / segmentWidth)
        const colHeightInc = colHeight / segmentDetail

        if (colY - colHeight <= -1) {
            colX += bandWidth * (1 + spacing)
            colY = 1
        }

        const segmentAngle = segmentHeight * heightToAngle
        const angleInc = segmentAngle / segmentDetail

        const segmentRadius = segmentHeight * heightToRadius
        const radiusInc = segmentRadius / segmentDetail

        for (let i = 0; i < segmentDetail - 1; i++, angle += angleInc, radius += radiusInc) {
            const currCos = Math.cos(angle)
            const currSin = Math.sin(angle)
            const currIR = radius - bandWidth * 0.5
            const currOR = radius + bandWidth * 0.5
            const nextCos = Math.cos(angle + angleInc)
            const nextSin = Math.sin(angle + angleInc)
            const nextIR = currIR + radiusInc
            const nextOR = currOR + radiusInc

            const posInner = [currCos * currIR, currSin * currIR]
            const posOuter = [currCos * currOR, currSin * currOR]
            const coordInner = [coords.left, coords.top + heightInc * i]
            const coordOuter = [coords.right, coords.top + heightInc * i]

            const colInner = [colX, colY]
            const colOuter = [colX + bandWidth, colY]
            const nextColInner = [colX, colY - colHeightInc]
            const nextColOuter = [colX + bandWidth, colY - colHeightInc]
            colY -= colHeightInc

            const nextPosInner = [nextCos * nextIR, nextSin * nextIR]
            const nextPosOuter = [nextCos * nextOR, nextSin * nextOR]
            const nextCoordInner = [coords.left, coords.top + heightInc * (i + 1)]
            const nextCoordOuter = [coords.right, coords.top + heightInc * (i + 1)]

            verts.push(
                ...posInner,
                ...colInner,
                ...coordInner,

                ...posOuter,
                ...colOuter,
                ...coordOuter,

                ...nextPosOuter,
                ...nextColOuter,
                ...nextCoordOuter,

                ...nextPosOuter,
                ...nextColOuter,
                ...nextCoordOuter,

                ...nextPosInner,
                ...nextColInner,
                ...nextCoordInner,

                ...posInner,
                ...colInner,
                ...coordInner
            )
        }
    }

    for (const coords of metadata.tiles) {
        addSegment(coords)
    }

    return new Float32Array(verts)
}

const ease = (t: number): number => {
    const t2 = t * t
    return t2 / (2 * (t2 - t) + 1)
}

const clamp = (v: number, min: number, max: number): number => {
    return Math.max(Math.min(v, max), min)
}

export default FullCoreRenderer

import { mat4 } from 'gl-matrix'
import { initProgram, initBuffer, initAttribute, initTexture } from '../lib/gl-wrap'
import ColumnTextureMapper, { ColumnTextureMetadata } from '../lib/column-texture'
import vertSource from '../shaders/full-core-vert.glsl?raw'
import fragSource from '../shaders/full-core-frag.glsl?raw'

const POS_FPV = 2
const TEX_FPV = 2
const STRIDE = POS_FPV + POS_FPV + TEX_FPV

const TRANSFORM_SPEED = 1
const NUM_SEGMENT = 10000

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
        metadata: ColumnTextureMetadata
    ) {
        this.program = initProgram(gl, vertSource, fragSource)

        const mineralMapAspect = mineralMaps[0].height / mineralMaps[0].width
        const verts = getFullCoreVerts(metadata, mineralMapAspect, NUM_SEGMENT, 0.3)
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

        this.targetShape = 0
        this.shapeT = 0
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

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.numVertex)
    }
}

const getFullCoreVerts = (
    metadata: ColumnTextureMetadata,
    texAspect: number,
    numSegment: number,
    spacing: number
): Float32Array => {
    const texMapper = new ColumnTextureMapper(metadata)

    const bandWidth = 0.025
    const minRadius = bandWidth * 5
    const maxRadius = 1
    const numRotation = Math.ceil((maxRadius - minRadius) / (bandWidth * (1 + spacing)))
    const maxAngle = Math.PI * 2 * numRotation
    const coordToCol = bandWidth / metadata.width
    const breakEpsilon = 0.00001

    const verts: Array<number> = []
    const addVertRow = (
        segmentInd: number,
        coord: [number, number],
        width: number
    ): void => {
        const segmentT = segmentInd / numSegment
        const spiralT = Math.pow(segmentT, 0.7)
        const angle = maxAngle * spiralT
        const radius = (maxRadius - minRadius) * spiralT + minRadius
        const columnCoord = [coord[0] - 0.5, -coord[1] + 0.5]
        const columnX = columnCoord[0] * coordToCol * (1 + spacing)
        const columnY = columnCoord[1] * coordToCol * texAspect
        verts.push(
            Math.cos(angle) * (radius - width * 0.5),
            Math.sin(angle) * (radius - width * 0.5),
            columnX - width * 0.5,
            columnY,
            coord[0],
            coord[1],
            Math.cos(angle) * (radius + width * 0.5),
            Math.sin(angle) * (radius + width * 0.5),
            columnX + width * 0.5,
            columnY,
            coord[0] + metadata.width,
            coord[1]
        )
    }

    for (let i = 0; i < numSegment; i++) {
        const thisT = i / numSegment
        const nextT = (i + 1) / numSegment
        const { coord, breakPercentage } = texMapper.get(thisT, nextT)
        addVertRow(i, coord, bandWidth)

        if (breakPercentage !== null) {
            const breakT = thisT * (1 - breakPercentage) + nextT * breakPercentage
            const { coord: lowCoord } = texMapper.get(breakT - breakEpsilon)
            const { coord: highCoord } = texMapper.get(breakT + breakEpsilon)

            // add two sets of verts at same position with different tex coords
            // so interpolation between end / start of columns doesn't break
            addVertRow(i + breakPercentage, lowCoord, bandWidth)
            addVertRow(i + breakPercentage, lowCoord, 0)
            addVertRow(i + breakPercentage, highCoord, 0)
            addVertRow(i + breakPercentage, highCoord, bandWidth)
        }
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

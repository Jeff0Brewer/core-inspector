import { mat4 } from 'gl-matrix'
import { initProgram, initBuffer, initAttribute, initTexture } from '../lib/gl-wrap'
import ColumnTextureMapper, { ColumnTextureMetadata } from '../lib/column-texture'
import vertSource from '../shaders/full-core-vert.glsl?raw'
import fragSource from '../shaders/full-core-frag.glsl?raw'

const POS_FPV = 2
const TEX_FPV = 2
const STRIDE = POS_FPV + POS_FPV + TEX_FPV

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
        metadata: ColumnTextureMetadata,
        numSegment: number,
        numRotation: number
    ) {
        this.program = initProgram(gl, vertSource, fragSource)

        const verts = getFullCoreVerts(metadata, numSegment, numRotation)
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
        this.currMineral = Math.min(Math.max(0, i), this.minerals.length - 1)
    }

    draw (gl: WebGLRenderingContext): void {
        gl.useProgram(this.program)

        gl.bindTexture(gl.TEXTURE_2D, this.minerals[this.currMineral])
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer)
        this.bindAttrib()

        this.shapeT = this.shapeT * 0.95 + this.targetShape * 0.05
        this.setShapeT(this.shapeT)

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.numVertex)
    }
}

const getFullCoreVerts = (
    metadata: ColumnTextureMetadata,
    numSegment: number,
    numRotation: number
): Float32Array => {
    const breakEpsilon = 0.00001
    const bandWidth = 0.025
    const texMapper = new ColumnTextureMapper(metadata)

    const maxAngle = Math.PI * 2 * numRotation
    const minRadius = bandWidth * 5
    const maxRadius = 1

    const verts: Array<number> = []
    const addVertRow = (
        segmentInd: number,
        coord: [number, number],
        width: number
    ): void => {
        const segmentT = segmentInd / numSegment
        const angle = maxAngle * segmentT
        const radius = (maxRadius - minRadius) * segmentT + minRadius
        const columnX = ((coord[0] - 0.5) / metadata.width) * bandWidth
        const columnY = ((1.0 - coord[1]) - 0.5) * 2.0
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

export default FullCoreRenderer

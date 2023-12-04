import { mat4 } from 'gl-matrix'
import { initProgram, initBuffer, initAttribute, initTexture } from '../lib/gl-wrap'
import ColumnTextureMapper, { ColumnTextureMetadata } from '../lib/column-texture'
import vertSource from '../shaders/punchcard-vert.glsl?raw'
import fragSource from '../shaders/punchcard-frag.glsl?raw'

const POS_FPV = 2
const TEX_FPV = 2
const STRIDE = POS_FPV + POS_FPV + TEX_FPV

const TRANSFORM_SPEED = 1

class PunchcardRenderer {
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

        const verts = getPunchcardVerts(metadata, mineralMaps[0].width, mineralMaps[0].height, 0.3)
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

        gl.drawArrays(gl.POINTS, 0, this.numVertex)
    }
}

const getPunchcardVerts = (
    metadata: ColumnTextureMetadata,
    texWidth: number,
    texHeight: number,
    spacing: number
): Float32Array => {
    const texMapper = new ColumnTextureMapper(metadata)
    const numRow = metadata.heights.reduce((total, height) =>
        total + Math.round(height * texHeight),
    0
    )
    const texAspect = texHeight / texWidth

    const bandWidth = 0.025
    const minRadius = bandWidth * 5
    const maxRadius = 1
    const numRotation = Math.ceil((maxRadius - minRadius) / (bandWidth * (1 + spacing)))
    const maxAngle = Math.PI * 2 * numRotation
    const coordToCol = bandWidth / metadata.width

    const verts: Array<number> = []
    const addPointRow = (
        rowInd: number,
        coord: [number, number]
    ): void => {
        const rowT = rowInd / numRow
        const angle = maxAngle * rowT
        const radius = (maxRadius - minRadius) * rowT + minRadius
        const columnCoord = [
            (coord[0] - 0.5) * coordToCol * (1 + spacing),
            (-coord[1] + 0.5) * coordToCol * texAspect
        ]
        const columnInc = bandWidth / 3
        const coordInc = metadata.width / 3
        for (let i = 0; i < 3; i++) {
            verts.push(
                Math.cos(angle) * (radius - bandWidth * 0.5 + columnInc * i),
                Math.sin(angle) * (radius - bandWidth * 0.5 + columnInc * i),
                columnCoord[0] - bandWidth * 0.5 + columnInc * i,
                columnCoord[1],
                coord[0] + coordInc * i,
                coord[1]
            )
        }
    }

    for (let i = 0; i < numRow; i++) {
        const { coord } = texMapper.get(i / numRow)
        addPointRow(i, coord)
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

export default PunchcardRenderer

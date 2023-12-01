import { mat4 } from 'gl-matrix'
import { initProgram, initBuffer, initAttribute, initTexture, getTextureAttachments } from '../lib/gl-wrap'
import ColumnTextureMapper, { ColumnTextureMetadata } from '../lib/column-texture'
import vertSource from '../shaders/full-core-vert.glsl?raw'
import fragSource from '../shaders/full-core-frag.glsl?raw'

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
    const addVertRow = (segmentInd: number, coord: [number, number]): void => {
        const segmentT = segmentInd / numSegment
        const angle = maxAngle * segmentT
        const radius = (maxRadius - minRadius) * segmentT + minRadius
        verts.push(
            Math.cos(angle) * (radius - bandWidth * 0.5),
            Math.sin(angle) * (radius - bandWidth * 0.5),
            coord[0],
            coord[1],
            Math.cos(angle) * (radius + bandWidth * 0.5),
            Math.sin(angle) * (radius + bandWidth * 0.5),
            coord[0] + metadata.width,
            coord[1]
        )
    }

    for (let i = 0; i < numSegment; i++) {
        const thisT = i / numSegment
        const nextT = (i + 1) / numSegment
        const { coord, breakPercentage } = texMapper.get(thisT, nextT)
        addVertRow(i, coord)

        if (breakPercentage !== null) {
            const breakT = thisT * (1 - breakPercentage) + nextT * breakPercentage
            const { coord: lowCoord } = texMapper.get(breakT - breakEpsilon)
            const { coord: highCoord } = texMapper.get(breakT + breakEpsilon)

            // add two sets of verts at same position with different tex coords
            // so interpolation between end / start of columns doesn't break
            addVertRow(i + breakPercentage, lowCoord)
            addVertRow(i + breakPercentage, highCoord)
        }
    }

    return new Float32Array(verts)
}

const POS_FPV = 2
const TEX_FPV = 2
const STRIDE = POS_FPV + TEX_FPV

class FullCoreRenderer {
    program: WebGLProgram
    buffer: WebGLBuffer
    textures: Array<WebGLTexture>
    texAttachments: Array<number>
    bindAttrib: () => void
    setProj: (m: mat4) => void
    setView: (m: mat4) => void
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

        this.texAttachments = getTextureAttachments(gl, mineralMaps.length)
        this.textures = []
        for (let i = 0; i < mineralMaps.length; i++) {
            gl.activeTexture(this.texAttachments[i])

            const texture = initTexture(gl)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, gl.LUMINANCE, gl.UNSIGNED_BYTE, mineralMaps[i])
            this.textures.push(texture)

            const textureLoc = gl.getUniformLocation(this.program, `mineral${i}`)
            gl.uniform1i(textureLoc, i)
        }

        const bindPosition = initAttribute(gl, this.program, 'position', POS_FPV, STRIDE, 0)
        const bindTexCoord = initAttribute(gl, this.program, 'texCoord', TEX_FPV, STRIDE, POS_FPV)
        this.bindAttrib = (): void => {
            bindPosition()
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
    }

    draw (gl: WebGLRenderingContext): void {
        gl.useProgram(this.program)

        for (let i = 0; i < this.textures.length; i++) {
            gl.activeTexture(this.texAttachments[i])
            gl.bindTexture(gl.TEXTURE_2D, this.textures[i])
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer)
        this.bindAttrib()

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.numVertex)
    }
}

export default FullCoreRenderer

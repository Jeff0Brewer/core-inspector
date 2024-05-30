import { GlContext, GlProgram, GlBuffer, GlTextureFramebuffer } from '../lib/gl-wrap'
import { TileTextureMetadata } from '../lib/metadata'
import { POS_FPV, TEX_FPV } from '../lib/vert-gen'
import { CanvasCtx, glToCanvas } from '../vis/part'
import MineralBlender from '../vis/mineral-blend'
import vertSource from '../shaders/punchcard-part-vert.glsl?raw'
import fragSource from '../shaders/punchcard-part-frag.glsl?raw'

const STRIDE = POS_FPV + TEX_FPV

class PunchcardPartRenderer {
    program: GlProgram
    buffer: GlBuffer
    setPointSize: (s: number) => void
    setOffsetX: (o: number) => void
    setBinX: (b: number) => void
    setWidthScale: (s: number) => void
    setPixelSize: (s: number) => void

    constructor (gl: GlContext) {
        this.program = new GlProgram(gl, vertSource, fragSource)
        this.program.bind(gl)

        this.buffer = new GlBuffer(gl)
        this.buffer.addAttribute(gl, this.program, 'position', POS_FPV, STRIDE, 0)
        this.buffer.addAttribute(gl, this.program, 'texCoord', TEX_FPV, STRIDE, POS_FPV)

        const pointSizeLoc = this.program.getUniformLocation(gl, 'pointSize')
        const offsetXLoc = this.program.getUniformLocation(gl, 'offsetX')
        const binXLoc = this.program.getUniformLocation(gl, 'binX')
        const widthScaleLoc = this.program.getUniformLocation(gl, 'widthScale')
        const pixelSizeLoc = this.program.getUniformLocation(gl, 'pixelSize')
        this.setPointSize = (s: number): void => { gl.uniform1f(pointSizeLoc, s) }
        this.setOffsetX = (o: number): void => { gl.uniform1f(offsetXLoc, o) }
        this.setBinX = (b: number): void => { gl.uniform1f(binXLoc, b) }
        this.setWidthScale = (s: number): void => { gl.uniform1f(widthScaleLoc, s) }
        this.setPixelSize = (s: number): void => { gl.uniform1f(pixelSizeLoc, s) }
    }

    getChannelPunchcard (
        gl: GlContext,
        metadata: TileTextureMetadata,
        ids: Array<string>,
        part: string,
        minerals: MineralBlender,
        output: CanvasCtx,
        width: number,
        widthScale: number
    ): void {
        const partInd = ids.indexOf(part)
        const tile = metadata.punchTiles[partInd]
        const tileAspect = (2 * tile.height / tile.width)

        const numColumns = minerals.sources.length
        const numRows = Math.round(numColumns * tileAspect)
        const height = Math.round(width * tileAspect)
        width = Math.round(widthScale * width)

        const xInc = 2 / numColumns
        const yInc = 2 / numRows
        const yStart = -1 + yInc * 0.5
        const xStart = -1 + xInc * 0.5

        const tyInc = tile.height / numRows
        const tyStart = tile.top + tyInc * 0.5
        const tx = tile.left + tile.width * 0.5

        const columnVerts = []
        for (let i = 0; i < numRows; i++) {
            columnVerts.push(
                xStart,
                yStart + yInc * i,
                tx,
                tyStart + tyInc * i
            )
        }

        const numVertex = columnVerts.length / STRIDE
        this.buffer.setData(gl, new Float32Array(columnVerts))

        const framebuffer = new GlTextureFramebuffer(gl, width, height)
        framebuffer.bind(gl)
        this.program.bind(gl)
        this.buffer.bind(gl)

        this.setPointSize(0.8 * width / (widthScale * numColumns))
        this.setWidthScale(1 / widthScale)
        this.setBinX(tile.width / 3)

        gl.viewport(0, 0, width, height)
        for (let i = 0; i < numColumns; i++) {
            this.setOffsetX(i * xInc)
            minerals.bindSourceTexture(gl, i)
            gl.drawArrays(gl.POINTS, 0, numVertex)
        }

        output.canvas.width = width
        output.canvas.height = height

        glToCanvas(gl, framebuffer, output)

        framebuffer.drop(gl)
    }

    getPunchcard (
        gl: GlContext,
        metadata: TileTextureMetadata,
        ids: Array<string>,
        part: string,
        minerals: MineralBlender,
        output: CanvasCtx,
        width: number
    ): void {
        const partInd = ids.indexOf(part)
        const tile = metadata.punchTiles[partInd]

        // temp
        const pointPerRow = 3
        const numRows = metadata.punchNumRows[partInd]
        width = Math.round(width)
        const height = 2 * Math.round(width * tile.height / tile.width)

        const framebuffer = new GlTextureFramebuffer(gl, width, height)

        const verts = []

        const xInc = 2 / pointPerRow
        const yInc = 2 / numRows
        const xStart = -1 + xInc * 0.5
        const yStart = -1 + yInc * 0.5

        const txInc = tile.width / pointPerRow
        const tyInc = tile.height / numRows
        const txStart = tile.left + txInc * 0.5
        const tyStart = tile.top + tyInc * 0.5

        for (let i = 0; i < numRows; i++) {
            for (let j = 0; j < pointPerRow; j++) {
                verts.push(
                    xStart + xInc * j,
                    yStart + yInc * i,
                    txStart + txInc * j,
                    tyStart + tyInc * i
                )
            }
        }

        const numVertex = verts.length / STRIDE
        this.buffer.setData(gl, new Float32Array(verts))

        framebuffer.bind(gl)
        this.program.bind(gl)
        this.buffer.bind(gl)
        minerals.bindTexture(gl)

        this.setPointSize(0.8 * width / pointPerRow)
        this.setOffsetX(0)
        this.setBinX(0)
        this.setWidthScale(1)

        gl.viewport(0, 0, width, height)
        gl.drawArrays(gl.POINTS, 0, numVertex)

        output.canvas.width = width
        output.canvas.height = height

        glToCanvas(gl, framebuffer, output)

        framebuffer.drop(gl)
    }
}

export default PunchcardPartRenderer

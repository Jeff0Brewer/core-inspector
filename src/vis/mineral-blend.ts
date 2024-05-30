import { vec3 } from 'gl-matrix'
import { GlContext, GlProgram, GlBuffer, GlTexture, GlTextureFramebuffer, getTextureAttachments } from '../lib/gl-wrap'
import { GenericPalette } from '../components/blend-provider'
import { StringMap } from '../lib/util'
import { POS_FPV, TEX_FPV, FULLSCREEN_RECT } from '../lib/vert-gen'
import vertSource from '../shaders/mineral-blend-vert.glsl?raw'
import fragSource from '../shaders/mineral-blend-frag.glsl?raw'

// get enum for blend modes since must send as uniform to shader
const BLEND_MODES = { additive: 0, maximum: 1 } as const
type BlendMode = keyof typeof BLEND_MODES

type BlendParams = {
    magnitudes: StringMap<number>,
    visibilities: StringMap<boolean>,
    palette: GenericPalette,
    saturation: number,
    threshold: number,
    mode: BlendMode,
    monochrome: boolean
}

const STRIDE = POS_FPV + TEX_FPV

class MineralBlender {
    program: GlProgram
    buffer: GlBuffer
    framebuffer: GlTextureFramebuffer
    sources: Array<GlTexture>
    setMode: (m: BlendMode) => void
    setSaturation: (s: number) => void
    setThreshold: (t: number) => void
    setMagUniform: Array<(m: number) => void>
    setColUniform: Array<(c: vec3) => void>

    numVertex: number
    width: number
    height: number
    minerals: Array<string>

    constructor (gl: GlContext, sources: Array<HTMLImageElement>, minerals: Array<string>) {
        // store width / height for output texture framebuffer viewport size
        this.width = sources[0].width
        this.height = sources[0].height

        this.minerals = minerals

        this.program = new GlProgram(gl, vertSource, fragSource)

        this.buffer = new GlBuffer(gl)
        this.buffer.setData(gl, FULLSCREEN_RECT)
        this.buffer.addAttribute(gl, this.program, 'position', POS_FPV, STRIDE, 0)
        this.buffer.addAttribute(gl, this.program, 'texCoord', TEX_FPV, STRIDE, POS_FPV)
        this.numVertex = FULLSCREEN_RECT.length / STRIDE

        // get attachments for source textures and output,
        // first attachment reserved for output texture
        const textureAttachments = getTextureAttachments(gl, sources.length + 1)

        this.sources = []
        for (let i = 0; i < sources.length; i++) {
            // add one to attachment ind to skip output attachment
            const texture = new GlTexture(gl, textureAttachments[i + 1])
            texture.setData(gl, gl.LUMINANCE, gl.LUMINANCE, gl.UNSIGNED_BYTE, sources[i])
            this.sources.push(texture)
        }

        // init texture framebuffer of same size as source textures for blended output
        this.framebuffer = new GlTextureFramebuffer(gl, this.width, this.height, textureAttachments[0])

        const saturationLoc = this.program.getUniformLocation(gl, 'saturation')
        const thresholdLoc = this.program.getUniformLocation(gl, 'threshold')
        const modeLoc = this.program.getUniformLocation(gl, 'mode')
        this.setSaturation = (s: number): void => { gl.uniform1f(saturationLoc, s) }
        this.setThreshold = (t: number): void => { gl.uniform1f(thresholdLoc, t) }
        this.setMode = (m: BlendMode): void => { gl.uniform1f(modeLoc, BLEND_MODES[m]) }

        this.program.bind(gl)
        this.setMagUniform = []
        this.setColUniform = []
        for (let i = 0; i < sources.length; i++) {
            // init texture uniforms statically
            const textureLoc = this.program.getUniformLocation(gl, `texture${i}`)
            gl.uniform1i(textureLoc, i + 1) // add one since attachment 0 is reserved for output

            // get closures to set each magnitude / color uniforms easily on update
            const magnitudeLoc = this.program.getUniformLocation(gl, `magnitude${i}`)
            this.setMagUniform.push((m: number) => {
                gl.uniform1f(magnitudeLoc, m)
            })

            const colorLoc = this.program.getUniformLocation(gl, `color${i}`)
            this.setColUniform.push((c: vec3) => {
                gl.uniform3fv(colorLoc, c)
            })
        }
    }

    update (gl: GlContext, params: BlendParams): void {
        const { palette, magnitudes, visibilities, saturation, threshold, mode, monochrome } = params

        const colors = this.minerals.map(mineral =>
            getBlendColor(palette, visibilities, monochrome, mineral)
        )

        this.framebuffer.bind(gl)
        this.program.bind(gl)
        this.buffer.bind(gl)
        this.setSaturation(saturation)
        this.setThreshold(threshold)
        this.setMode(mode)

        for (let i = 0; i < this.sources.length; i++) {
            this.sources[i].bind(gl)
            this.setMagUniform[i](colors[i] !== null ? magnitudes[this.minerals[i]] : 0)
            this.setColUniform[i](colors[i] || [0, 0, 0])
        }

        gl.viewport(0, 0, this.width, this.height)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.numVertex)

        // bind default framebuffer on completion
        this.framebuffer.unbind(gl)
    }

    bindSourceTexture (gl: GlContext, ind: number): void {
        this.sources[ind].bind(gl, gl.TEXTURE0)
    }

    bindTexture (gl: GlContext): void {
        this.framebuffer.bindTexture(gl)
    }

    bindFramebuffer (gl: GlContext): void {
        this.framebuffer.bind(gl)
    }

    drop (gl: GlContext): void {
        this.program.drop(gl)
        this.buffer.drop(gl)
        this.framebuffer.drop(gl)
        this.sources.forEach(source => source.drop(gl))
    }
}

function isToggleable (
    mineral: string,
    palette: GenericPalette,
    visibilities: StringMap<boolean>
): boolean {
    if (visibilities[mineral]) {
        return true
    }
    if (palette.type === 'labelled') {
        return mineral in palette.colors
    } else {
        const numVisible = Object.values(visibilities).filter(v => v).length
        return numVisible < palette.colors.length
    }
}

// TODO: simplify
// maps colors to minerals based on blend params
function getBlendColor (
    palette: GenericPalette,
    visibilities: StringMap<boolean>,
    monochrome: boolean,
    mineral: string
): vec3 | null {
    if (!visibilities[mineral]) {
        return null
    }
    if (monochrome && Object.values(visibilities).filter(v => v).length === 1) {
        return [1, 1, 1]
    }
    if (palette.type === 'labelled') {
        return palette.colors[mineral] || null
    }

    const colorIndex = palette.order.indexOf(mineral)
    if (colorIndex === -1) {
        return null
    }
    return palette.colors[colorIndex]
}

export default MineralBlender
export {
    getBlendColor,
    isToggleable
}
export type {
    BlendParams,
    BlendMode
}

import { vec3 } from 'gl-matrix'
import { GlContext, GlProgram, GlBuffer, GlTexture, GlTextureFramebuffer, getTextureAttachments } from '../lib/gl-wrap'
import { GenericPalette } from '../lib/palettes'
import vertSource from '../shaders/mineral-blend-vert.glsl?raw'

// get enum for blend modes since must send as uniform to shader
const BLEND_MODES = { additive: 0, maximum: 1 } as const
type BlendMode = keyof typeof BLEND_MODES

type BlendParams = {
    magnitudes: Array<number>,
    visibilities: Array<boolean>,
    palette: GenericPalette,
    saturation: number,
    threshold: number,
    mode: BlendMode,
    monochrome: boolean
}

// rectangle with texture coordinates to fill full viewport.
// used to render fragments in full viewport for blending
const FULLSCREEN_RECT = new Float32Array([
    -1, -1, 0, 0,
    1, -1, 1, 0,
    -1, 1, 0, 1,
    1, 1, 1, 1
])
const POS_FPV = 2
const TEX_FPV = 2
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

        const fragSource = getBlendFrag(sources.length)
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
        this.framebuffer = new GlTextureFramebuffer(gl, this.width, this.height)

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

        const colors = this.minerals.map((mineral, i) =>
            getBlendColor(palette, visibilities, monochrome, mineral, i)
        )

        this.framebuffer.bind(gl)
        this.program.bind(gl)
        this.buffer.bind(gl)
        this.setSaturation(saturation)
        this.setThreshold(threshold)
        this.setMode(mode)

        for (let i = 0; i < this.sources.length; i++) {
            this.sources[i].bind(gl)
            this.setMagUniform[i](colors[i] !== null ? magnitudes[i] : 0)
            this.setColUniform[i](colors[i] || [0, 0, 0])
        }

        gl.viewport(0, 0, this.width, this.height)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.numVertex)

        // bind default framebuffer on completion
        this.framebuffer.unbind(gl)
    }

    bind (gl: GlContext): void {
        this.framebuffer.bindTexture(gl)
    }

    drop (gl: GlContext): void {
        this.program.drop(gl)
        this.buffer.drop(gl)
        this.framebuffer.drop(gl)
        this.sources.forEach(source => source.drop(gl))
    }
}

// maps colors to minerals based on blend params
function getBlendColor (
    palette: GenericPalette,
    visibilities: Array<boolean>,
    monochrome: boolean,
    mineral: string,
    index: number
): vec3 | null {
    if (!visibilities[index]) {
        return null
    }
    if (monochrome && visibilities.filter(v => v).length === 1) {
        return [1, 1, 1]
    }
    if (palette.type === 'labelled') {
        return palette.colors[mineral] || null
    } else {
        const priorNumVisible = visibilities.slice(0, index).filter(v => v).length
        return palette.colors[priorNumVisible] || null
    }
}

// create fragment shader dynamically to blend from variable number of input textures.
function getBlendFrag (numTexture: number): string {
    const uniforms = [
        'uniform float saturation;',
        'uniform float threshold;',
        'uniform float mode;'
    ]
    const variables = [
        `bool isMaximumMode = abs(mode - ${BLEND_MODES.maximum.toFixed(1)}) < 0.001;`,
        'float maxValue = 0.0;'
    ]
    const abundances = []
    const values = []
    const maxCalcs = []
    const blendCalcs = []

    for (let i = 0; i < numTexture; i++) {
        // add uniforms for each channel's texture / color / blend magnitude
        uniforms.push(
            `uniform sampler2D texture${i};`,
            `uniform vec3 color${i};`,
            `uniform float magnitude${i};`
        )

        // get mineral abundance from texture
        abundances.push(`float abundance${i} = texture2D(texture${i}, vTexCoord).x;`)

        // get blend value from abundance / blend magnitude / threshold
        values.push(`float value${i} = magnitude${i} * smoothstep(threshold, 1.0, abundance${i});`)

        // get maximum blend value for comparison in maximum mode
        maxCalcs.push(`maxValue = max(maxValue, value${i});`)

        // get on / off value to control if all sources are added together
        // or if only the maximum should be used
        const isMaximumValue = `(maxValue == value${i})`
        const checkMax = `((!isMaximumMode || ${isMaximumValue}) ? 1.0 : 0.0)`

        // get final blended color by summing texture values with params applied
        const semicolonOrPlus = i === numTexture - 1 ? ';' : ' +'
        blendCalcs.push(
            `${checkMax} * value${i} * color${i}${semicolonOrPlus}`
        )
    }

    const fragSource = [
        'precision highp float;',
        'varying vec2 vTexCoord;',
        ...uniforms,
        'void main() {',
        ...variables,
        ...abundances,
        ...values,
        ...maxCalcs,
        'vec3 color =',
        ...blendCalcs,
        'gl_FragColor = vec4(color * saturation, 1.0);',
        '}'
    ].join('\n')

    return fragSource
}

export default MineralBlender
export { getBlendColor }
export type {
    BlendParams,
    BlendMode
}

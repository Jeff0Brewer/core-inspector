import { vec3 } from 'gl-matrix'
import {
    initProgram,
    initBuffer,
    initTextureFramebuffer,
    initTexture,
    initAttribute,
    getTextureAttachments
} from '../lib/gl-wrap'
import vertSource from '../shaders/mineral-blend-vert.glsl?raw'

const POS_FPV = 2
const TEX_FPV = 2
const STRIDE = POS_FPV + TEX_FPV

const BLEND_MODES = {
    additive: 0,
    maximum: 1
} as const
type BlendMode = keyof typeof BLEND_MODES

type BlendParams = {
    magnitudes: Array<number>,
    colors: Array<vec3 | null>,
    saturation: number,
    threshold: number,
    mode: BlendMode
}

class MineralBlender {
    program: WebGLProgram
    buffer: WebGLBuffer
    bindAttrib: () => void
    textureAttachments: Array<number>

    sources: Array<WebGLTexture>
    output: WebGLTexture
    framebuffer: WebGLFramebuffer

    setMode: (m: BlendMode) => void
    setSaturation: (s: number) => void
    setThreshold: (t: number) => void
    setMagUniform: Array<(m: number) => void>
    setColUniform: Array<(c: vec3) => void>

    numVertex: number
    width: number
    height: number

    constructor (gl: WebGLRenderingContext, sources: Array<HTMLImageElement>) {
        // store width / height for output / viewport size
        this.width = sources[0].width
        this.height = sources[0].height

        const fragSource = getBlendFrag(sources.length)
        this.program = initProgram(gl, vertSource, fragSource)

        this.buffer = initBuffer(gl)
        gl.bufferData(gl.ARRAY_BUFFER, FULLSCREEN_RECT, gl.STATIC_DRAW)
        this.numVertex = FULLSCREEN_RECT.length / STRIDE

        const bindPosition = initAttribute(gl, this.program, 'position', POS_FPV, STRIDE, 0)
        const bindTexCoord = initAttribute(gl, this.program, 'texCoord', TEX_FPV, STRIDE, POS_FPV)
        this.bindAttrib = (): void => {
            bindPosition()
            bindTexCoord()
        }

        // get attachments for source textures and output,
        // first attachment reserved for output texture
        this.textureAttachments = getTextureAttachments(gl, sources.length + 1)

        this.sources = []
        for (let i = 0; i < sources.length; i++) {
            // add one to attachment ind to skip output attachment
            gl.activeTexture(this.textureAttachments[i + 1])
            const texture = initTexture(gl)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, gl.LUMINANCE, gl.UNSIGNED_BYTE, sources[i])
            this.sources.push(texture)
        }

        // init texture framebuffer of same size as source textures for blended output
        const { texture, framebuffer } = initTextureFramebuffer(gl, this.width, this.height)
        this.output = texture
        this.framebuffer = framebuffer

        const saturationLoc = gl.getUniformLocation(this.program, 'saturation')
        this.setSaturation = (s: number): void => { gl.uniform1f(saturationLoc, s) }

        const thresholdLoc = gl.getUniformLocation(this.program, 'threshold')
        this.setThreshold = (t: number): void => { gl.uniform1f(thresholdLoc, t) }

        const modeLoc = gl.getUniformLocation(this.program, 'mode')
        this.setMode = (m: BlendMode): void => { gl.uniform1f(modeLoc, BLEND_MODES[m]) }

        this.setMagUniform = []
        this.setColUniform = []
        for (let i = 0; i < sources.length; i++) {
            // init texture uniforms statically
            const textureLoc = gl.getUniformLocation(this.program, `texture${i}`)
            gl.uniform1i(textureLoc, i + 1) // add one since attachment 0 is reserved for output

            // get closures to set each magnitude / color uniforms easily on update
            const magnitudeLoc = gl.getUniformLocation(this.program, `magnitude${i}`)
            this.setMagUniform.push((m: number) => {
                gl.uniform1f(magnitudeLoc, m)
            })

            const colorLoc = gl.getUniformLocation(this.program, `color${i}`)
            this.setColUniform.push((c: vec3) => {
                gl.uniform3fv(colorLoc, c)
            })
        }
    }

    bind (gl: WebGLRenderingContext): void {
        gl.activeTexture(this.textureAttachments[0])
        gl.bindTexture(gl.TEXTURE_2D, this.output)
    }

    update (gl: WebGLRenderingContext, params: BlendParams): void {
        const { magnitudes, colors, saturation, threshold, mode } = params
        if (magnitudes.length < this.sources.length) {
            throw new Error('Not enough blend magnitudes for all source textures')
        }
        if (magnitudes.length !== colors.length) {
            throw new Error('Different number of magnitudes and colors')
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer)
        gl.viewport(0, 0, this.width, this.height)
        gl.useProgram(this.program)

        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer)
        this.bindAttrib()
        this.setSaturation(saturation)
        this.setThreshold(threshold)
        this.setMode(mode)
        for (let i = 0; i < this.sources.length; i++) {
            gl.activeTexture(this.textureAttachments[i + 1])
            gl.bindTexture(gl.TEXTURE_2D, this.sources[i])
            this.setMagUniform[i](colors[i] !== null ? magnitudes[i] : 0)
            this.setColUniform[i](colors[i] || [0, 0, 0])
        }

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.numVertex)
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    }
}

// create fragment shader dynamically to blend textures based on number of input textures
const getBlendFrag = (numTexture: number): string => {
    const uniforms = [
        'uniform float saturation;',
        'uniform float threshold;',
        'uniform float mode;'
    ]
    const values = [
        'float maxValue = 0.0;'
    ]
    const calcs = []

    for (let i = 0; i < numTexture; i++) {
        // add uniform for each channel's source texture, blend color, and blend magnitude
        uniforms.push(
            `uniform sampler2D texture${i};`,
            `uniform vec3 color${i};`,
            `uniform float magnitude${i};`
        )
        // get value from each channel's source texture and apply threshold
        // also get max value to compare to if in maximum blend mode
        values.push(
            `float value${i} = smoothstep(threshold, 1.0, texture2D(texture${i}, vTexCoord).x);`,
            `maxValue = max(maxValue, value${i});`
        )

        // get on / off value to control if all sources are added together
        // or if only the maximum should be used
        const isNotMaxumumMode = `(abs(mode - ${BLEND_MODES.maximum.toFixed(1)}) > 0.001)`
        const isMaximumValue = `maxValue == value${i}`
        const checkMax = `((${isNotMaxumumMode} || ${isMaximumValue}) ? 1.0 : 0.0)`

        // get final blended color by summing texture values with params applied
        const endChar = i === numTexture - 1 ? ';' : ' +'
        calcs.push(
            `${checkMax} * value${i} * magnitude${i} * color${i}${endChar}`
        )
    }

    const fragSource = [
        'precision highp float;',
        ...uniforms,
        'varying vec2 vTexCoord;',
        'void main() {',
        ...values,
        'vec3 color =',
        ...calcs,
        'gl_FragColor = vec4(color * saturation, 1.0);',
        '}'
    ]
    return fragSource.join('\n')
}

const FULLSCREEN_RECT = new Float32Array([
    -1, -1, 0, 0,
    1, -1, 1, 0,
    -1, 1, 0, 1,
    1, 1, 1, 1
])

export default MineralBlender
export type {
    BlendParams,
    BlendMode
}

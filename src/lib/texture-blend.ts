import { initProgram, initBuffer, initTextureFramebuffer, initTexture, initAttribute, getTextureAttachments } from '../lib/gl-wrap'
import vertSource from '../shaders/blend-vert.glsl?raw'

const POS_FPV = 2
const TEX_FPV = 2
const STRIDE = POS_FPV + TEX_FPV

class TextureBlender {
    program: WebGLProgram
    buffer: WebGLBuffer
    bindAttrib: () => void
    textureAttachments: Array<number>
    sourceTextures: Array<WebGLTexture>
    texture: WebGLTexture
    framebuffer: WebGLFramebuffer

    setMagUniform: Array<(v: number) => void>

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

        // get attachments for source textures
        // remove attachment 0 since it's used for the output texture
        this.textureAttachments = getTextureAttachments(gl, sources.length + 1)
        this.textureAttachments.shift()

        this.sourceTextures = []
        for (let i = 0; i < sources.length; i++) {
            gl.activeTexture(this.textureAttachments[i])
            const texture = initTexture(gl)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, gl.LUMINANCE, gl.UNSIGNED_BYTE, sources[i])
            this.sourceTextures.push(texture)
        }

        // init texture framebuffer of same size as source textures for blended output
        const { texture, framebuffer } = initTextureFramebuffer(gl, this.width, this.height)
        this.texture = texture
        this.framebuffer = framebuffer

        this.setMagUniform = []
        for (let i = 0; i < sources.length; i++) {
            // init texture / color uniforms statically
            const textureLoc = gl.getUniformLocation(this.program, `texture${i}`)
            const colorLoc = gl.getUniformLocation(this.program, `color${i}`)
            gl.uniform1i(textureLoc, i + 1) // add one since attachment 0 is reserved for output
            gl.uniform3fv(colorLoc, COLORS[i])

            // get closures to set each magnitude uniform easily on update
            const magnitudeLoc = gl.getUniformLocation(this.program, `magnitude${i}`)
            gl.uniform1f(magnitudeLoc, 1)
            this.setMagUniform.push((v: number) => {
                gl.uniform1f(magnitudeLoc, v)
            })
        }
    }

    bindSource (gl: WebGLRenderingContext, i: number): void {
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, this.sourceTextures[i])
    }

    bindBlended (gl: WebGLRenderingContext): void {
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, this.texture)
    }

    update (gl: WebGLRenderingContext, magnitudes: Array<number>): void {
        if (magnitudes.length < this.sourceTextures.length) {
            throw new Error('Not enough blend magnitudes for all source textures')
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer)
        gl.viewport(0, 0, this.width, this.height)
        gl.useProgram(this.program)

        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer)
        this.bindAttrib()
        for (let i = 0; i < this.sourceTextures.length; i++) {
            gl.activeTexture(this.textureAttachments[i])
            gl.bindTexture(gl.TEXTURE_2D, this.sourceTextures[i])

            this.setMagUniform[i](magnitudes[i])
        }

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.numVertex)
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    }
}

// create fragment shader dynamically to blend textures based on number of input textures
const getBlendFrag = (numTexture: number): string => {
    const uniforms = []
    const values = []
    const calcs = []

    for (let i = 0; i < numTexture; i++) {
        // add uniform for each channel's source texture, blend color, and blend magnitude
        uniforms.push(
            `uniform sampler2D texture${i};`,
            `uniform vec3 color${i};`,
            `uniform float magnitude${i};`
        )
        // get value from each channel's source texture
        values.push(
            `float value${i} = texture2D(texture${i}, vTexCoord).x;`
        )
        // sum together colors based on texture value and magnitude
        // to get final blended color
        const end = i === numTexture - 1 ? ';' : ' +'
        calcs.push(
            `value${i} * magnitude${i} * color${i}${end}`
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
        'gl_FragColor = vec4(color, 1.0);',
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

const COLORS = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
    [0.5, 0.5, 0],
    [0, 0.5, 0.5],
    [0.5, 0, 0.5],
    [0.8, 0.8, 0.8]
]

export default TextureBlender

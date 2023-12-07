import { initProgram, initBuffer, initTextureFramebuffer, initTexture, initAttribute, getTextureAttachments } from '../lib/gl-wrap'
import vertSource from '../shaders/blend-vert.glsl?raw'

const POS_FPV = 2
const TEX_FPV = 2
const STRIDE = POS_FPV + TEX_FPV
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

class TextureBlender {
    program: WebGLProgram
    magnitudeSetters: Array<(v: number) => void>
    buffer: WebGLBuffer
    texture: WebGLTexture
    framebuffer: WebGLFramebuffer
    bindAttrib: () => void
    textureAttachments: Array<number>
    sourceTextures: Array<WebGLTexture>
    numVertex: number
    width: number
    height: number

    constructor (
        gl: WebGLRenderingContext,
        sources: Array<HTMLImageElement>
    ) {
        this.width = sources[0].width
        this.height = sources[0].height

        const fragSource = getBlendFrag(sources.length)
        this.program = initProgram(gl, vertSource, fragSource)

        this.magnitudeSetters = []
        for (let i = 0; i < sources.length; i++) {
            const textureLoc = gl.getUniformLocation(this.program, `texture${i}`)
            gl.uniform1i(textureLoc, i + 1)

            const colorLoc = gl.getUniformLocation(this.program, `color${i}`)
            gl.uniform3fv(colorLoc, COLORS[i])

            const magnitudeLoc = gl.getUniformLocation(this.program, `magnitude${i}`)
            gl.uniform1f(magnitudeLoc, 1)
            this.magnitudeSetters.push((v: number) => {
                gl.uniform1f(magnitudeLoc, v)
            })
        }

        this.buffer = initBuffer(gl)
        gl.bufferData(gl.ARRAY_BUFFER, FULLSCREEN_RECT, gl.STATIC_DRAW)
        this.numVertex = FULLSCREEN_RECT.length / STRIDE

        const bindPosition = initAttribute(gl, this.program, 'position', POS_FPV, STRIDE, 0)
        const bindTexCoord = initAttribute(gl, this.program, 'texCoord', TEX_FPV, STRIDE, POS_FPV)
        this.bindAttrib = (): void => {
            bindPosition()
            bindTexCoord()
        }

        this.textureAttachments = getTextureAttachments(gl, sources.length + 1)
        this.textureAttachments.shift() // remove texture0 attachment from source attachments
        this.sourceTextures = []
        for (let i = 0; i < sources.length; i++) {
            gl.activeTexture(this.textureAttachments[i])
            const texture = initTexture(gl)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, gl.LUMINANCE, gl.UNSIGNED_BYTE, sources[i])
            this.sourceTextures.push(texture)
        }

        gl.activeTexture(gl.TEXTURE0)
        const { texture, framebuffer } = initTextureFramebuffer(gl, this.width, this.height)
        this.texture = texture
        this.framebuffer = framebuffer
    }

    bindSource (gl: WebGLRenderingContext, i: number): void {
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, this.sourceTextures[i])
    }

    bindBlended (gl: WebGLRenderingContext): void {
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, this.texture)
    }

    update (gl: WebGLRenderingContext): void {
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer)

        gl.useProgram(this.program)
        gl.viewport(0, 0, this.width, this.height)

        for (let i = 0; i < this.sourceTextures.length; i++) {
            gl.activeTexture(this.textureAttachments[i])
            gl.bindTexture(gl.TEXTURE_2D, this.sourceTextures[i])
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer)
        this.bindAttrib()

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.numVertex)

        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    }
}

const getBlendFrag = (numTexture: number): string => {
    const fragSource = [
        'precision highp float;'
    ]
    // for each source texture add uniforms for
    // texture, blend color, and blend magnitude
    for (let i = 0; i < numTexture; i++) {
        fragSource.push(
            `uniform sampler2D texture${i};`,
            `uniform vec3 color${i};`,
            `uniform float magnitude${i};`
        )
    }

    fragSource.push(
        'varying vec2 vTexCoord;',
        'void main() {'
    )
    for (let i = 0; i < numTexture; i++) {
        fragSource.push(
            `float value${i} = texture2D(texture${i}, vTexCoord).x;`
        )
    }
    fragSource.push(
        'vec3 color ='
    )
    for (let i = 0; i < numTexture; i++) {
        const end = i === numTexture - 1 ? ';' : ' +'
        fragSource.push(
            `magnitude${i} * value${i} * color${i}${end}`
        )
    }

    fragSource.push(
        'gl_FragColor = vec4(color, 1.0);',
        '}'
    )
    return fragSource.join('\n')
}

export default TextureBlender

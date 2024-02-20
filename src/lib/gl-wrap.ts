type GlContext = WebGLRenderingContext
type TypedArray = Float32Array | Uint8Array // add array types as needed

const initGl = (canvas: HTMLCanvasElement): GlContext => {
    const gl = canvas.getContext('webgl')
    if (!gl) {
        throw new Error('WebGL context creation failed')
    }
    return gl
}

const initShader = (
    gl: GlContext,
    type: number,
    source: string
): WebGLShader => {
    const shader = gl.createShader(type)
    if (!shader) {
        throw new Error('Shader creation failed')
    }
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    const compileSuccess = gl.getShaderParameter(shader, gl.COMPILE_STATUS)
    if (!compileSuccess) {
        const log = gl.getShaderInfoLog(shader)
        throw new Error(`Shader compilation failed: ${log}`)
    }
    return shader
}

const getTextureAttachments = (gl: WebGLRenderingContext, length: number): Array<number> => {
    const attachments = [
        gl.TEXTURE0, gl.TEXTURE1, gl.TEXTURE2, gl.TEXTURE3, gl.TEXTURE4,
        gl.TEXTURE5, gl.TEXTURE6, gl.TEXTURE7, gl.TEXTURE8, gl.TEXTURE9
    ]
    if (length > attachments.length) {
        throw new Error('Too many texture attachments requested')
    }
    return attachments.slice(0, length)
}

class GlProgram {
    id: WebGLProgram

    constructor (gl: GlContext, vertSource: string, fragSource: string) {
        const vert = initShader(gl, gl.VERTEX_SHADER, vertSource)
        const frag = initShader(gl, gl.FRAGMENT_SHADER, fragSource)

        const program = gl.createProgram()
        if (!program) {
            throw new Error('Program creation failed')
        }
        gl.attachShader(program, vert)
        gl.attachShader(program, frag)
        gl.linkProgram(program)

        const linkSuccess = gl.getProgramParameter(program, gl.LINK_STATUS)
        if (!linkSuccess) {
            const log = gl.getProgramInfoLog(program)
            throw new Error(`Program linking failed: ${log}`)
        }

        gl.deleteShader(vert)
        gl.deleteShader(frag)

        this.id = program
    }

    bind (gl: GlContext): void {
        gl.useProgram(this.id)
    }

    getUniformLocation (gl: GlContext, name: string): WebGLUniformLocation | null {
        return gl.getUniformLocation(this.id, name)
    }

    drop (gl: GlContext): void {
        gl.deleteProgram(this.id)
    }
}

class GlBuffer {
    id: WebGLBuffer
    attributes: Array<(gl: GlContext) => void>

    constructor (gl: GlContext) {
        const buffer = gl.createBuffer()
        if (!buffer) {
            throw new Error('Buffer creation failed')
        }
        this.id = buffer
        this.attributes = []
    }

    bind (gl: GlContext): void {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.id)
        this.attributes.forEach(bind => bind(gl))
    }

    setData (gl: GlContext, data: TypedArray, type: number = gl.STATIC_DRAW): void {
        this.bind(gl)
        gl.bufferData(gl.ARRAY_BUFFER, data, type)
    }

    addAttribute (
        gl: GlContext,
        program: GlProgram,
        name: string,
        size: number,
        stride: number,
        offset: number,
        type: number = gl.FLOAT
    ): void {
        const location = gl.getAttribLocation(program.id, name)
        if (location === -1) {
            throw new Error(`Attribute ${name} not found in program`)
        }

        // gets byte size from gl type, can be extended for more types if needed
        let byteSize: number
        switch (type) {
            case gl.FLOAT:
                byteSize = Float32Array.BYTES_PER_ELEMENT
                break
            case gl.UNSIGNED_BYTE:
                byteSize = Uint8Array.BYTES_PER_ELEMENT
                break
        }

        // only normalize byte types
        const normalize = type === gl.UNSIGNED_BYTE

        // store vertex attrib pointer call in closure for future binding
        const bindAttrib = (gl: GlContext): void => {
            gl.vertexAttribPointer(
                location,
                size,
                type,
                normalize,
                stride * byteSize,
                offset * byteSize
            )
        }
        bindAttrib(gl)
        gl.enableVertexAttribArray(location)

        this.attributes.push(bindAttrib)
    }

    drop (gl: GlContext): void {
        gl.deleteBuffer(this.id)
    }
}

class GlTexture {
    id: WebGLTexture
    attachment: number

    constructor (gl: GlContext, attachment: number = gl.TEXTURE0) {
        gl.activeTexture(attachment)

        const texture = gl.createTexture()
        if (!texture) {
            throw new Error('Texture creation failed')
        }

        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            1,
            1,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            new Uint8Array([0, 0, 0, 255])
        )

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

        this.id = texture
        this.attachment = attachment
    }

    bind (gl: GlContext, attachment?: number): void {
        gl.activeTexture(attachment || this.attachment)
        gl.bindTexture(gl.TEXTURE_2D, this.id)
    }

    setData (
        gl: GlContext,
        internalFormat: number,
        format: number,
        type: number,
        pixels: HTMLImageElement
    ): void {
        this.bind(gl)
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, format, type, pixels)
    }

    drop (gl: GlContext): void {
        gl.deleteTexture(this.id)
    }
}

class GlTextureFramebuffer {
    framebuffer: WebGLFramebuffer
    texture: WebGLTexture
    attachment: number

    constructor (
        gl: GlContext,
        width: number,
        height: number,
        attachment: number = gl.TEXTURE0
    ) {
        const framebuffer = gl.createFramebuffer()
        if (!framebuffer) {
            throw new Error('Framebuffer creation failed')
        }

        gl.activeTexture(attachment)
        const texture = gl.createTexture()
        if (!texture) {
            throw new Error('Texture creation failed')
        }
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            width,
            height,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            null
        )
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)

        this.texture = texture
        this.framebuffer = framebuffer
        this.attachment = attachment
    }

    bind (gl: GlContext): void {
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer)
    }

    unbind (gl: GlContext): void {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    }

    bindTexture (gl: GlContext): void {
        gl.activeTexture(this.attachment)
        gl.bindTexture(gl.TEXTURE_2D, this.texture)
    }

    drop (gl: GlContext): void {
        gl.deleteFramebuffer(this.framebuffer)
        gl.deleteTexture(this.texture)
    }
}
export {
    initGl,
    getTextureAttachments,
    GlProgram,
    GlBuffer,
    GlTexture,
    GlTextureFramebuffer
}
export type {
    GlContext
}

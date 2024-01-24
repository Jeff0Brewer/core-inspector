import { vec3 } from 'gl-matrix'
import {
    GlContext,
    GlProgram,
    GlBuffer,
    GlTexture,
    GlTextureFramebuffer,
    getTextureAttachments
} from '../lib/gl-wrap'
import vertSource from '../shaders/mineral-blend-vert.glsl?raw'

const POS_FPV = 2
const TEX_FPV = 2
const STRIDE = POS_FPV + TEX_FPV

type LabelledPalette = {
    colors: { [mineral: string]: vec3 },
    type: 'labelled'
}

type UnlabelledPalette = {
    colors: Array<vec3>,
    type: 'unlabelled'
}

type GenericPalette = LabelledPalette | UnlabelledPalette

const COLOR_PRESETS: Array<GenericPalette> = [
    {
        type: 'labelled',
        colors: {
            chlorite: [0.6039, 0.6588, 0.5647],
            epidote: [0.6705, 0.7411, 0.6823],
            prehnite: [0.4156, 0.4745, 0.5764],
            zeolite: [1, 1, 1],
            amphibole: [0.8, 0.7843, 0.6941],
            pyroxene: [0.8039, 0.8509, 0.8666],
            gypsum: [0.4431, 0.5960, 0.3333],
            carbonate: [0.4705, 0.3450, 0.5882]
        }
    }, {
        type: 'labelled',
        colors: {
            chlorite: [0.2470, 0.6549, 0.8392],
            prehnite: [0.8039, 0.3490, 0.5647],
            zeolite: [0.9686, 0.6156, 0.5176],
            carbonate: [0.9803, 0.7529, 0.3686],
            'kaolinite-montmorillinite': [0.9333, 0.3882, 0.3215]
        }
    },
    {
        type: 'unlabelled',
        colors: [
            [0.4705, 0.3450, 0.5882],
            [0.6705, 0.7411, 0.6862],
            [0.4156, 0.4745, 0.5764]
        ]
    }, {
        type: 'unlabelled',
        colors: [
            [0.3803, 0.2313, 0.3529],
            [0.5372, 0.3764, 0.5568],
            [0.7294, 0.5843, 0.5764],
            [0.9294, 0.9764, 0.6666],
            [0.7843, 0.9803, 0.7411]
        ]
    },
    {
        type: 'unlabelled',
        colors: [
            [0.9647, 0.4274, 0.6078],
            [0.3921, 0.4549, 0.8039],
            [0.3019, 0.7529, 0.7098],
            [0.2039, 0.5647, 0.8627],
            [0.2196, 0.7568, 0.4470],
            [0.5843, 0.3803, 0.8862],
            [0.8901, 0.2039, 0.1843],
            [0.9647, 0.6, 0.2470],
            [1, 0.9294, 0.2901]
        ]
    }
]

const BLEND_MODES = {
    additive: 0,
    maximum: 1
} as const
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

const MINERALS = [
    'chlorite',
    'epidote',
    'prehnite',
    'zeolite',
    'amphibole',
    'pyroxene',
    'gypsum',
    'carbonate',
    'kaolinite-montmorillinite'
]

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

    constructor (gl: GlContext, sources: Array<HTMLImageElement>) {
        // store width / height for output / viewport size
        this.width = sources[0].width
        this.height = sources[0].height

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

    bind (gl: GlContext): void {
        this.framebuffer.bindTexture(gl)
    }

    drop (gl: GlContext): void {
        this.program.drop(gl)
        this.buffer.drop(gl)
        this.framebuffer.drop(gl)
        this.sources.forEach(source => source.drop(gl))
    }

    update (gl: GlContext, params: BlendParams): void {
        const { palette, magnitudes, visibilities, saturation, threshold, mode, monochrome } = params

        const colors = MINERALS.map((mineral, i) =>
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
export {
    getBlendColor,
    MINERALS,
    COLOR_PRESETS
}
export type {
    BlendParams,
    BlendMode,
    GenericPalette
}

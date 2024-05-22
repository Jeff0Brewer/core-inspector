import { vec3 } from 'gl-matrix'

function lerp (a: number, b: number, t: number): number {
    return a + (b - a) * t
}

function ease (t: number): number {
    const t2 = t * t
    return t2 / (2 * (t2 - t) + 1)
}

function clamp (v: number, min: number, max: number): number {
    return Math.max(Math.min(v, max), min)
}

function mapBounds (
    value: number,
    sourceMin: number,
    sourceMax: number,
    destMin: number,
    destMax: number
): number {
    const t = (value - sourceMin) / (sourceMax - sourceMin)
    return destMin + (destMax - destMin) * t
}

function roundTo (n: number, decimals: number): number {
    const scale = Math.pow(10, decimals)
    return Math.round(n * scale) / scale
}

function byteToHex (byte: number): string {
    const hex = byte.toString(16)
    return hex.length === 1 ? '0' + hex : hex
}

function bytesToHex (vec: Array<number>): string {
    return vec.map(byteToHex).join('')
}

function floatsToHex (vec: Array<number>): string {
    return vec.map(float => {
        const byte = Math.floor(float * 255)
        return byteToHex(byte)
    }).join('')
}

function formatPercent (p: number): string {
    return (p * 100).toFixed() + '%'
}

function parsePercent (p: string): number {
    return parseFloat(p.replace('%', '')) * 0.01
}

function formatFloat (f: number): string {
    return f.toFixed(2)
}

function padZeros (n: number | string, len: number = 4): string {
    const str = n.toString()
    if (str.length > len) {
        return str
    }
    const zeros = Array(len - str.length).fill('0').join('')
    return zeros + str
}

function getCssColor (color: vec3 | null): string {
    if (!color) {
        return 'transparent'
    }
    return `#${floatsToHex([color[0], color[1], color[2]])}`
}

function checkStringType (v: unknown): string {
    const vType = typeof v
    if (vType !== 'string') {
        throw new Error(`Expected type string, got ${vType}`)
    }
    return v as 'string'
}

// wierd typing since actual render context settings type is private
type CanvasRenderingContext2DSettings = {
    willReadFrequently?: boolean
}

function get2dContext (
    canvas: HTMLCanvasElement | OffscreenCanvas,
    settings: CanvasRenderingContext2DSettings = {}
): CanvasRenderingContext2D {
    const ctx = canvas.getContext('2d', settings)
    if (!ctx) {
        throw new Error('Could not get 2d rendering context from canvas')
    }
    // cast required due to custom settings type defined above
    return ctx as CanvasRenderingContext2D
}

function getImageData (img: HTMLImageElement | null): ImageData | null {
    if (img === null) { return null }
    const { width, height } = img

    const canvas = new OffscreenCanvas(width, height)
    const ctx = get2dContext(canvas)
    ctx.drawImage(img, 0, 0)

    return ctx.getImageData(0, 0, width, height)
}

// TODO: use dynamic img width
const IMG_WIDTH = 320
function getScale (viewWidth: number): string {
    return `x1/${(IMG_WIDTH / viewWidth).toFixed(0)}`
}

function notNull<T> (value: T | null): value is T {
    return value !== null
}

function downloadText (filename: string, text: string): void {
    const element = document.createElement('a')
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text))
    element.setAttribute('download', filename)
    element.style.display = 'none'

    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
}

type BoundRect = {
    top: number,
    bottom: number,
    left: number,
    right: number
}

type StringMap<T> = { [key: string]: T }

type ObjectRef<T> = {
    current: T
}

function animateForDuration (
    update: () => void,
    requestIdRef: ObjectRef<number>,
    durationMs: number = 1000
): void {
    let totalElapsed = 0
    let lastTime = 0
    window.cancelAnimationFrame(requestIdRef.current)

    const tick = (currTime: number): void => {
        update()

        const elapsed = currTime - lastTime
        lastTime = currTime
        if (elapsed < durationMs) {
            totalElapsed += elapsed
        }

        if (totalElapsed < durationMs) {
            requestIdRef.current = window.requestAnimationFrame(tick)
        }
    }

    requestIdRef.current = window.requestAnimationFrame(tick)
}

export {
    lerp,
    ease,
    clamp,
    mapBounds,
    roundTo,
    bytesToHex,
    floatsToHex,
    formatFloat,
    formatPercent,
    parsePercent,
    padZeros,
    getCssColor,
    checkStringType,
    get2dContext,
    getImageData,
    getScale,
    notNull,
    downloadText,
    animateForDuration
}
export type {
    BoundRect,
    StringMap,
    ObjectRef
}

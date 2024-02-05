import { vec3 } from 'gl-matrix'

function ease (t: number): number {
    const t2 = t * t
    return t2 / (2 * (t2 - t) + 1)
}

function clamp (v: number, min: number, max: number): number {
    return Math.max(Math.min(v, max), min)
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

type BoundRect = {
    top: number,
    bottom: number,
    left: number,
    right: number
}

type StringMap<T> = { [key: string]: T }

export {
    ease,
    clamp,
    bytesToHex,
    floatsToHex,
    formatFloat,
    formatPercent,
    parsePercent,
    padZeros,
    getCssColor,
    checkStringType
}
export type {
    BoundRect,
    StringMap
}

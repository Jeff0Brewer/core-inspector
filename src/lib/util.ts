import { vec2, vec3, vec4 } from 'gl-matrix'

const ease = (t: number): number => {
    const t2 = t * t
    return t2 / (2 * (t2 - t) + 1)
}

const clamp = (v: number, min: number, max: number): number => {
    return Math.max(Math.min(v, max), min)
}

const byteToHex = (byte: number): string => {
    const hex = byte.toString(16)
    return hex.length === 1 ? '0' + hex : hex
}

const bytesToHex = (vec: Array<number>): string => {
    return vec.map(byteToHex).join('')
}

const floatsToHex = (vec: Array<number>): string => {
    return vec.map(float => {
        const byte = Math.floor(float * 255)
        return byteToHex(byte)
    }).join('')
}

const formatPercent = (p: number): string => {
    return (p * 100).toFixed() + '%'
}

const parsePercent = (p: string): number => {
    return parseFloat(p.replace('%', '')) * 0.01
}

const formatFloat = (f: number): string => {
    return f.toFixed(2)
}

function padZeros (n: number | string, len: number): string {
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

type BoundRect = {
    top: number,
    bottom: number,
    left: number,
    right: number
}

export {
    ease,
    clamp,
    bytesToHex,
    floatsToHex,
    formatFloat,
    formatPercent,
    parsePercent,
    padZeros,
    getCssColor
}
export type { BoundRect }

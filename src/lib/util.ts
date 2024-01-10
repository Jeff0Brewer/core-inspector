import { vec2, vec3, vec4 } from 'gl-matrix'

const ease = (t: number): number => {
    const t2 = t * t
    return t2 / (2 * (t2 - t) + 1)
}

const clamp = (v: number, min: number, max: number): number => {
    return Math.max(Math.min(v, max), min)
}

const vecToHex = (v: Array<number> | vec2 | vec3 | vec4): string => {
    const hex = []
    for (const x of v) {
        const h = x.toString(16)
        // add leading 0 if hex value only one char
        hex.push(h.length === 1 ? '0' + h : h)
    }
    return hex.join('')
}

const formatPercent = (p: number): string => {
    return (p * 100).toFixed()
}

const formatFloat = (f: number): string => {
    return f.toFixed(2)
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
    vecToHex,
    formatPercent,
    formatFloat
}
export type { BoundRect }

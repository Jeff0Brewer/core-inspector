const ease = (t: number): number => {
    const t2 = t * t
    return t2 / (2 * (t2 - t) + 1)
}

const clamp = (v: number, min: number, max: number): number => {
    return Math.max(Math.min(v, max), min)
}

type BoundRect = {
    top: number,
    bottom: number,
    left: number,
    right: number
}

export { ease, clamp }
export type { BoundRect }

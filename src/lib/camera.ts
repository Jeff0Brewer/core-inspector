import { mat4, vec3 } from 'gl-matrix'
import { clamp } from '../lib/util'

const MIN_ZOOM = 0.1
const MAX_ZOOM = 1.5

class Camera2D {
    matrix: mat4
    eye: vec3
    focus: vec3
    up: vec3
    zoom: number

    constructor (eye: vec3, focus: vec3, up: vec3) {
        this.matrix = mat4.create()
        mat4.lookAt(this.matrix, eye, focus, up)

        this.eye = vec3.clone(eye)
        this.focus = vec3.clone(focus)
        this.up = vec3.clone(up)

        this.zoom = vec3.dist(this.eye, this.focus)
    }

    setZoom (t: number): void {
        this.zoom = clamp(t, 0, 1) * (MAX_ZOOM - MIN_ZOOM) + MIN_ZOOM

        const lookDir = vec3.create()
        vec3.subtract(lookDir, this.eye, this.focus)
        vec3.normalize(lookDir, lookDir)

        vec3.scaleAndAdd(this.eye, this.focus, lookDir, this.zoom)
        mat4.lookAt(this.matrix, this.eye, this.focus, this.up)
    }
}

export default Camera2D

import { mat4, vec3 } from 'gl-matrix'
import { clamp } from '../lib/util'

const PAN_SPEED = 0.003
const MIN_ZOOM = 0.1
const MAX_ZOOM = 1.5

class Camera2D {
    matrix: mat4
    focus: vec3
    lookDir: vec3
    up: vec3
    right: vec3
    zoom: number

    constructor (eye: vec3, focus: vec3, up: vec3) {
        this.matrix = mat4.create()
        mat4.lookAt(this.matrix, eye, focus, up)

        vec3.normalize(up, up)

        this.lookDir = vec3.create()
        vec3.subtract(this.lookDir, eye, focus)
        vec3.normalize(this.lookDir, this.lookDir)

        this.focus = vec3.clone(focus)
        this.up = vec3.clone(up)
        this.right = vec3.cross(vec3.create(), this.lookDir, up)

        this.zoom = vec3.dist(eye, focus)
    }

    setZoom (t: number): void {
        this.zoom = clamp(t, 0, 1) * (MAX_ZOOM - MIN_ZOOM) + MIN_ZOOM

        const eye = vec3.create()
        vec3.scaleAndAdd(eye, this.focus, this.lookDir, this.zoom)
        mat4.lookAt(this.matrix, eye, this.focus, this.up)
    }

    pan (dx: number, dy: number): void {
        const zoomFactor = Math.pow(this.zoom / MAX_ZOOM, 0.7)
        vec3.scaleAndAdd(this.focus, this.focus, this.up, dy * PAN_SPEED * zoomFactor)
        vec3.scaleAndAdd(this.focus, this.focus, this.right, dx * PAN_SPEED * zoomFactor)

        const eye = vec3.create()
        vec3.scaleAndAdd(eye, this.focus, this.lookDir, this.zoom)
        mat4.lookAt(this.matrix, eye, this.focus, this.up)
    }
}

export default Camera2D

import { mat4, vec3 } from 'gl-matrix'
import { clamp } from '../lib/util'

const PAN_SPEED = 0.003
const ZOOM_SPEED = 0.0005
const MIN_ZOOM = 0.1
const MAX_ZOOM = 1.5

type CameraSettings = {
    zoom: number
}

class Camera2D {
    matrix: mat4
    eye: vec3
    focus: vec3
    lookDir: vec3
    up: vec3
    right: vec3
    zoomT: number

    constructor (focus: vec3, lookDir: vec3, up: vec3, zoomT: number) {
        vec3.normalize(up, up)
        vec3.normalize(lookDir, lookDir)

        const zoom = zoomT * (MAX_ZOOM - MIN_ZOOM) + MIN_ZOOM
        this.eye = vec3.scaleAndAdd(vec3.create(), focus, lookDir, zoom)

        this.matrix = mat4.create()
        mat4.lookAt(this.matrix, this.eye, focus, up)

        this.focus = vec3.clone(focus)
        this.lookDir = vec3.clone(lookDir)
        this.up = vec3.clone(up)
        this.right = vec3.cross(vec3.create(), this.lookDir, up)
        this.zoomT = zoomT
    }

    getFocusDistance (): number {
        return this.zoomT * (MAX_ZOOM - MIN_ZOOM) + MIN_ZOOM
    }

    setZoom (t: number): void {
        this.zoomT = clamp(t, 0, 1)
        const zoom = this.zoomT * (MAX_ZOOM - MIN_ZOOM) + MIN_ZOOM

        vec3.scaleAndAdd(this.eye, this.focus, this.lookDir, zoom)
        mat4.lookAt(this.matrix, this.eye, this.focus, this.up)
    }

    zoom (d: number): void {
        this.zoomT = clamp(this.zoomT * (1 + d * ZOOM_SPEED), 0, 1)
        const zoom = this.zoomT * (MAX_ZOOM - MIN_ZOOM) + MIN_ZOOM

        vec3.scaleAndAdd(this.eye, this.focus, this.lookDir, zoom)
        mat4.lookAt(this.matrix, this.eye, this.focus, this.up)
    }

    pan (dx: number, dy: number): void {
        const zoomFactor = Math.pow(this.zoomT, 0.7)
        vec3.scaleAndAdd(this.focus, this.focus, this.up, dy * PAN_SPEED * zoomFactor)
        vec3.scaleAndAdd(this.focus, this.focus, this.right, dx * PAN_SPEED * zoomFactor)

        const zoom = this.zoomT * (MAX_ZOOM - MIN_ZOOM) + MIN_ZOOM

        vec3.scaleAndAdd(this.eye, this.focus, this.lookDir, zoom)
        mat4.lookAt(this.matrix, this.eye, this.focus, this.up)
    }
}

export default Camera2D
export type { CameraSettings }

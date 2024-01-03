import { mat4, vec3 } from 'gl-matrix'
import { clamp } from '../lib/util'

const PAN_SPEED = 0.003
const ZOOM_SPEED = 0.0005
const MIN_ZOOM = 0.2
const MAX_ZOOM = 1.75

type CameraSettings = {
    zoom: number
}

class Camera2D {
    focus: vec3
    lookDir: vec3
    up: vec3
    right: vec3
    eye: vec3
    matrix: mat4
    zoomT: number

    constructor (focus: vec3, lookDir: vec3, up: vec3, zoomT: number) {
        this.zoomT = zoomT
        this.focus = vec3.clone(focus)

        this.lookDir = vec3.create()
        vec3.normalize(this.lookDir, lookDir)

        this.up = vec3.create()
        vec3.normalize(this.up, up)

        this.right = vec3.create()
        vec3.cross(this.right, this.lookDir, this.up)

        this.eye = vec3.create()
        vec3.scaleAndAdd(
            this.eye,
            this.focus,
            this.lookDir,
            this.zoomDistance()
        )

        this.matrix = mat4.create()
        mat4.lookAt(this.matrix, this.eye, this.focus, this.up)
    }

    zoomDistance (): number {
        return this.zoomT * (MAX_ZOOM - MIN_ZOOM) + MIN_ZOOM
    }

    zoom (d: number): void {
        this.zoomT = clamp(this.zoomT * (1 + d * ZOOM_SPEED), 0, 1)
        vec3.scaleAndAdd(this.eye, this.focus, this.lookDir, this.zoomDistance())
        mat4.lookAt(this.matrix, this.eye, this.focus, this.up)
    }

    setZoom (t: number): void {
        this.zoomT = clamp(t, 0, 1)
        vec3.scaleAndAdd(this.eye, this.focus, this.lookDir, this.zoomDistance())
        mat4.lookAt(this.matrix, this.eye, this.focus, this.up)
    }

    pan (dx: number, dy: number): void {
        const zoomFactor = Math.pow(this.zoomT, 0.7)
        vec3.scaleAndAdd(this.focus, this.focus, this.up, dy * PAN_SPEED * zoomFactor)
        vec3.scaleAndAdd(this.focus, this.focus, this.right, dx * PAN_SPEED * zoomFactor)

        vec3.scaleAndAdd(this.eye, this.focus, this.lookDir, this.zoomDistance())
        mat4.lookAt(this.matrix, this.eye, this.focus, this.up)
    }
}

export default Camera2D
export type { CameraSettings }

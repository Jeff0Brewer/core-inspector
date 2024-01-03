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
    zoomT: number
    eye: vec3
    focus: vec3
    up: vec3
    matrix: mat4

    constructor (zoomT: number) {
        this.zoomT = zoomT

        this.eye = vec3.fromValues(0, 0, this.zoomDistance())
        this.focus = vec3.fromValues(0, 0, 0)
        this.up = vec3.fromValues(0, 1, 0)

        this.matrix = mat4.create()
        mat4.lookAt(this.matrix, this.eye, this.focus, this.up)
    }

    zoomDistance (): number {
        return this.zoomT * (MAX_ZOOM - MIN_ZOOM) + MIN_ZOOM
    }

    zoom (d: number): void {
        this.zoomT = clamp(this.zoomT * (1 + d * ZOOM_SPEED), 0, 1)
        this.eye[2] = this.zoomDistance()

        mat4.lookAt(this.matrix, this.eye, this.focus, this.up)
    }

    setZoom (t: number): void {
        this.zoomT = clamp(t, 0, 1)
        this.eye[2] = this.zoomDistance()

        mat4.lookAt(this.matrix, this.eye, this.focus, this.up)
    }

    pan (dx: number, dy: number): void {
        const zoomFactor = Math.pow(this.zoomT, 0.7)
        this.eye[0] -= dx * PAN_SPEED * zoomFactor
        this.eye[1] += dy * PAN_SPEED * zoomFactor
        this.focus[0] = this.eye[0]
        this.focus[1] = this.eye[1]

        mat4.lookAt(this.matrix, this.eye, this.focus, this.up)
    }
}

export default Camera2D
export type { CameraSettings }

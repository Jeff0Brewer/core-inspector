import { mat4, vec3 } from 'gl-matrix'
import { clamp, ease } from '../lib/util'
import { CoreShape, TRANSFORM_SPEED } from '../vis/core'

const MOUSE_PAN_SPEED = 0.003
const WHEEL_PAN_SPEED = 0.001
const ZOOM_SPEED = 0.0003
const MIN_ZOOM = 0.3
const MAX_ZOOM = 1.75

type CameraMode = CoreShape

class Camera2D {
    zoomT: number
    eye: vec3
    focus: vec3
    up: vec3
    matrix: mat4
    mode: CameraMode

    targetFocus: vec3
    targetFocusT: number

    constructor (zoomT: number, shape: CoreShape) {
        this.zoomT = zoomT

        this.eye = vec3.fromValues(0, 0, this.zoomDistance())
        this.focus = vec3.fromValues(0, 0, 0)
        this.up = vec3.fromValues(0, 1, 0)

        this.matrix = mat4.create()
        mat4.lookAt(this.matrix, this.eye, this.focus, this.up)

        this.mode = shape
        this.targetFocus = vec3.clone(this.focus)
        this.targetFocusT = 1
    }

    resetFocus (): void {
        vec3.lerp(this.focus, this.focus, this.targetFocus, ease(this.targetFocusT))
        this.targetFocusT = 0
        this.targetFocus = vec3.fromValues(0, 0, 0)
    }

    update (elapsed: number): void {
        if (this.targetFocusT < 1) {
            const focus = vec3.create()
            vec3.lerp(focus, this.focus, this.targetFocus, ease(this.targetFocusT))
            const eye = vec3.fromValues(focus[0], focus[1], this.zoomDistance())
            mat4.lookAt(this.matrix, eye, focus, this.up)

            this.targetFocusT += TRANSFORM_SPEED * elapsed
            if (this.targetFocusT >= 1) {
                vec3.copy(this.focus, this.targetFocus)
                vec3.copy(this.eye, [this.focus[0], this.focus[1], this.zoomDistance()])
            }
        } else {
            mat4.lookAt(this.matrix, this.eye, this.focus, this.up)
        }
    }

    setMode (mode: CameraMode): void {
        this.mode = mode
        this.resetFocus()
    }

    pan (x: number, y: number): void {
        const zoomFactor = Math.pow(this.zoomT + 0.1, 0.7)
        const dx = x * zoomFactor
        const dy = y * zoomFactor
        this.focus[0] += dx
        this.focus[1] += dy
        this.targetFocus[0] += dx
        this.targetFocus[1] += dy
        this.eye[0] = this.focus[0]
        this.eye[1] = this.focus[1]
    }

    zoom (t: number): void {
        this.zoomT = clamp(t, 0, 1)
        this.eye[2] = this.zoomDistance()
    }

    zoomDistance (): number {
        return this.zoomT * (MAX_ZOOM - MIN_ZOOM) + MIN_ZOOM
    }

    mousewheel (d: number): void {
        if (this.mode === 'column') {
            const x = d * WHEEL_PAN_SPEED
            this.pan(x, 0)
        } else {
            const t = this.zoomT + d * ZOOM_SPEED
            this.zoom(t)
        }
    }

    mousedrag (dx: number, dy: number): void {
        const x = -1 * dx * MOUSE_PAN_SPEED
        if (this.mode === 'column') {
            this.pan(x, 0)
        } else {
            const y = dy * MOUSE_PAN_SPEED
            this.pan(x, y)
        }
    }
}

export default Camera2D

import { FC, useEffect, useRef } from 'react'
import VisRenderer from '../vis/vis'
import '../styles/app.css'

const App: FC = () => {
    const visRef = useRef<VisRenderer | null>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const frameIdRef = useRef<number>(-1)

    // init vis renderer, setup resizing
    useEffect(() => {
        if (!canvasRef.current) {
            throw new Error('No reference to canvas')
        }

        visRef.current = new VisRenderer(canvasRef.current)
        const resize = (): void => { visRef.current?.resize() }

        window.addEventListener('resize', resize)
        return () => {
            window.removeEventListener('resize', resize)
        }
    }, [])

    // start draw loop
    useEffect(() => {
        const tick = (): void => {
            visRef.current?.draw()
            frameIdRef.current = window.requestAnimationFrame(tick)
        }

        frameIdRef.current = window.requestAnimationFrame(tick)
        return () => {
            window.cancelAnimationFrame(frameIdRef.current)
        }
    }, [])

    return (
        <canvas
            ref={canvasRef}
        ></canvas>
    )
}

export default App

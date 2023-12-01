import { FC, useEffect, useRef } from 'react'
import '../styles/app.css'

const App: FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    const resizeCanvas = (): void => {
        if (!canvasRef.current) {
            throw new Error('No reference to canvas')
        }
        canvasRef.current.width = window.innerWidth * window.devicePixelRatio
        canvasRef.current.height = window.innerHeight * window.devicePixelRatio
    }

    useEffect(() => {
        window.addEventListener('resize', resizeCanvas)
        return () => {
            window.removeEventListener('resize', resizeCanvas)
        }
    }, [])

    return (
        <canvas
            ref={canvasRef}
        ></canvas>
    )
}

export default App

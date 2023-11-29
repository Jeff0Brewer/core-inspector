import { FC, useEffect, useRef } from 'react'
import '../styles/vis.css'

const Vis: FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        // setup canvas resizing on window event
        window.addEventListener('resize', () => {
            if (!canvasRef.current) {
                throw new Error('No reference to canvas')
            }
            canvasRef.current.width = window.innerWidth * window.devicePixelRatio
            canvasRef.current.height = window.innerHeight * window.devicePixelRatio
        })
    }, [])

    return (
        <canvas></canvas>
    )
}

export default Vis

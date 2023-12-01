import { FC, useEffect, useRef } from 'react'
import { loadImageAsync } from '../lib/load'
import VisRenderer from '../vis/vis'
import '../styles/app.css'

const App: FC = () => {
    const visRef = useRef<VisRenderer | null>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const frameIdRef = useRef<number>(-1)

    const initVisRenderer = async (canvas: HTMLCanvasElement): Promise<void> => {
        const mineralPaths = [
            './data/gt1/full-mineral-00.png',
            './data/gt1/full-mineral-01.png',
            './data/gt1/full-mineral-02.png',
            './data/gt1/full-mineral-03.png',
            './data/gt1/full-mineral-04.png',
            './data/gt1/full-mineral-05.png',
            './data/gt1/full-mineral-06.png'
        ]
        const mineralPromises = mineralPaths.map(p => loadImageAsync(p))
        const minerals = await Promise.all(mineralPromises)
        const metadata = await fetch('./data/gt1/metadata.json').then(res => res.json())

        visRef.current = new VisRenderer(canvas, minerals, metadata)
    }

    useEffect(() => {
        if (!canvasRef.current) {
            throw new Error('No reference to canvas')
        }
        initVisRenderer(canvasRef.current)
    }, [])

    useEffect(() => {
        const resize = (): void => { visRef.current?.resize() }

        // temporary mineral interaction for testing
        const setMineral = (e: KeyboardEvent): void => {
            const val = parseInt(e.key)
            if (!Number.isNaN(val)) {
                visRef.current?.fullCore.setCurrMineral(val)
            }
        }
        window.addEventListener('resize', resize)
        window.addEventListener('keydown', setMineral)
        return () => {
            window.removeEventListener('resize', resize)
            window.removeEventListener('keydown', setMineral)
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

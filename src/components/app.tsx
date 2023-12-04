import { FC, useEffect, useRef } from 'react'
import { loadImageAsync } from '../lib/load'
import VisRenderer from '../vis/vis'
import '../styles/app.css'

const App: FC = () => {
    const visRef = useRef<VisRenderer | null>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const frameIdRef = useRef<number>(-1)

    const initVisRenderer = async (canvas: HTMLCanvasElement): Promise<void> => {
        const basePath = './data/gt1/downscaled/'
        const mineralPaths = [
            basePath + '00.png',
            basePath + '01.png',
            basePath + '02.png',
            basePath + '03.png',
            basePath + '04.png',
            basePath + '05.png',
            basePath + '06.png'
        ]
        const mineralPromises = mineralPaths.map(p => loadImageAsync(p))
        const minerals = await Promise.all(mineralPromises)
        const metadata = await fetch(basePath + 'metadata.json').then(res => res.json())

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
            if (e.key === ' ' && visRef.current) {
                visRef.current.fullCore.targetShape += 1
                visRef.current.fullCore.targetShape %= 2
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
        let lastT = 0
        const tick = (t: number): void => {
            const elapsed = (t - lastT) * 0.001
            lastT = t

            visRef.current?.draw(elapsed)
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

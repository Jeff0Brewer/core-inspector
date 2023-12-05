import { FC, useEffect, useRef } from 'react'
import { loadImageAsync } from '../lib/load'
import VisRenderer from '../vis/vis'
import '../styles/app.css'

const App: FC = () => {
    const visRef = useRef<VisRenderer | null>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const frameIdRef = useRef<number>(-1)

    const initVisRenderer = async (canvas: HTMLCanvasElement): Promise<void> => {
        const basePath = './data/gt1/'
        const downscaledPaths = [
            basePath + 'downscaled/00.png',
            basePath + 'downscaled/01.png',
            basePath + 'downscaled/02.png',
            basePath + 'downscaled/03.png',
            basePath + 'downscaled/04.png',
            basePath + 'downscaled/05.png',
            basePath + 'downscaled/06.png'
        ]
        const downscaledPromises = downscaledPaths.map(p => loadImageAsync(p))
        const punchcardPaths = [
            basePath + 'punchcard/00.png',
            basePath + 'punchcard/01.png',
            basePath + 'punchcard/02.png',
            basePath + 'punchcard/03.png',
            basePath + 'punchcard/04.png',
            basePath + 'punchcard/05.png',
            basePath + 'punchcard/06.png'
        ]
        const punchcardPromises = punchcardPaths.map(p => loadImageAsync(p))

        const downscaledTextures = await Promise.all(downscaledPromises)
        const downscaledMetadata = await fetch(basePath + 'downscaled/metadata.json').then(res => res.json())

        const punchcardTextures = await Promise.all(punchcardPromises)
        const punchcardMetadata = await fetch(basePath + 'punchcard/metadata.json').then(res => res.json())

        visRef.current = new VisRenderer(
            canvas,
            downscaledTextures,
            downscaledMetadata,
            punchcardTextures,
            punchcardMetadata
        )
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

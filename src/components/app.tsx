import { FC, useState, useEffect, useRef } from 'react'
import { loadImageAsync } from '../lib/load'
import VisRenderer from '../vis/vis'
import '../styles/app.css'

const MINERALS = [
    'chlorite',
    'epidote',
    'prehnite',
    'zeolite',
    'amphibole',
    'pyroxene',
    'gypsum'
]

const App: FC = () => {
    const [currMineral, setCurrMineral] = useState<number>(0)
    const visRef = useRef<VisRenderer | null>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const frameIdRef = useRef<number>(-1)

    useEffect(() => {
        visRef.current?.setCurrMineral(currMineral)
    }, [currMineral])

    useEffect(() => {
        if (!canvasRef.current) {
            throw new Error('No reference to canvas')
        }

        const initVisRenderer = async (canvas: HTMLCanvasElement): Promise<void> => {
            const basePath = './data/gt1'
            const numMinerals = 7

            // fetch visualization textures / metadata
            const downscaledPaths = []
            const punchcardPaths = []
            for (let i = 0; i < numMinerals; i++) {
                downscaledPaths.push(`${basePath}/downscaled/0${i}.png`)
                punchcardPaths.push(`${basePath}/punchcard/0${i}.png`)
            }
            const [downscaledTextures, punchcardTextures] = await Promise.all([
                Promise.all(downscaledPaths.map(p => loadImageAsync(p))),
                Promise.all(punchcardPaths.map(p => loadImageAsync(p)))
            ])
            const [downscaledMetadata, punchcardMetadata] = await Promise.all([
                fetch(`${basePath}/downscaled/metadata.json`).then(res => res.json()),
                fetch(`${basePath}/punchcard/metadata.json`).then(res => res.json())
            ])

            // initialize visualization
            visRef.current = new VisRenderer(
                canvas,
                downscaledTextures,
                downscaledMetadata,
                punchcardTextures,
                punchcardMetadata
            )
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
        <main>
            <canvas
                ref={canvasRef}
            ></canvas>
            <div>
                <MineralSelect
                    minerals={MINERALS}
                    currMineral={currMineral}
                    setMineral={setCurrMineral}
                />
            </div>
        </main>
    )
}

type MineralSelectProps = {
    minerals: Array<string>,
    currMineral: number,
    setMineral: (i: number) => void
}

const MineralSelect: FC<MineralSelectProps> = ({ minerals, currMineral, setMineral }) => {
    return (
        <div className={'mineral-select'}>
            { minerals.map((name, i) => (
                <button
                    key={i}
                    data-active={i === currMineral}
                    onClick={(): void => setMineral(i)}
                >
                    {name}
                </button>
            ))}
        </div>
    )
}

export default App

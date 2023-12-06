import { FC, useState, useEffect, useRef } from 'react'
import { loadImageAsync } from '../lib/load'
import { COLUMN_SHAPE, SPIRAL_SHAPE } from '../vis/full-core'
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
    const [currShape, setCurrShape] = useState<number>(0)
    const visRef = useRef<VisRenderer | null>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const frameIdRef = useRef<number>(-1)

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
            setCurrMineral(visRef.current.fullCore.currMineral)
            setCurrShape(visRef.current.fullCore.targetShape)
        }

        initVisRenderer(canvasRef.current)
    }, [])

    useEffect(() => {
        const resize = (): void => { visRef.current?.resize() }
        window.addEventListener('resize', resize)
        return () => {
            window.removeEventListener('resize', resize)
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

    const setMineral = (i: number): void => {
        visRef.current?.fullCore.setCurrMineral(i)
        setCurrMineral(i)
    }

    const setShape = (t: number): void => {
        visRef.current?.fullCore.setShape(t)
        setCurrShape(t)
    }

    return (
        <main>
            <canvas
                ref={canvasRef}
            ></canvas>
            <div>
                <div className={'top-bar'}>
                    <ShapeSelect
                        setShape={setShape}
                        currShape={currShape}
                    />
                </div>
                <MineralSelect
                    minerals={MINERALS}
                    currMineral={currMineral}
                    setMineral={setMineral}
                />
            </div>
        </main>
    )
}

type ShapeSelectProps = {
    setShape: (t: number) => void
    currShape: number
}

const ShapeSelect: FC<ShapeSelectProps> = ({ setShape, currShape }) => {
    return (
        <div className={'view-select'}>
            <button
                data-active={currShape === COLUMN_SHAPE}
                onClick={(): void => setShape(COLUMN_SHAPE)}
            >
                {'column'}
            </button>
            <button
                data-active={currShape === SPIRAL_SHAPE}
                onClick={(): void => setShape(SPIRAL_SHAPE)}
            >
                {'spiral'}
            </button>
        </div>
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

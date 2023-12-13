import { useState, useEffect, useRef, ReactElement } from 'react'
import { loadImageAsync } from '../lib/load'
import VisRenderer from '../vis/vis'
import Vis from '../components/vis'
import '../styles/app.css'

function App (): ReactElement {
    const [visRenderer, setVisRenderer] = useState<VisRenderer | null>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    // load data and init vis renderer
    useEffect(() => {
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
            const [downscaledImgs, punchcardImgs] = await Promise.all([
                Promise.all(downscaledPaths.map(p => loadImageAsync(p))),
                Promise.all(punchcardPaths.map(p => loadImageAsync(p)))
            ])
            const [downscaledMeta, punchcardMeta] = await Promise.all([
                fetch(`${basePath}/downscaled/metadata.json`).then(res => res.json()),
                fetch(`${basePath}/punchcard/metadata.json`).then(res => res.json())
            ])

            setVisRenderer(
                new VisRenderer(
                    canvas,
                    downscaledImgs,
                    downscaledMeta,
                    punchcardImgs,
                    punchcardMeta
                )
            )
        }

        if (!canvasRef.current) {
            throw new Error('No reference to canvas')
        }
        initVisRenderer(canvasRef.current)
    }, [])

    return (
        <main>
            <canvas ref={canvasRef}></canvas>
            { visRenderer !== null &&
                <Vis vis={visRenderer} /> }
        </main>
    )
}

export default App

import { useState, useEffect, useRef, ReactElement } from 'react'
import { loadImageAsync } from '../lib/load'
import LoadIcon from '../components/load-icon'
import Vis from '../components/vis'
import MetadataHover from '../components/metadata-hover'
import CoreVisSettings from '../components/core-vis-settings'
import CoreViewSliders from '../components/core-view-sliders'
import MineralControls from '../components/mineral-controls'
import VisRenderer, { VIS_DEFAULTS } from '../vis/vis'
import '../styles/app.css'

const CORES = ['gt1', 'gt2', 'gt3']

function App (): ReactElement {
    const [vis, setVis] = useState<VisRenderer | null>(null)
    const [core, setCore] = useState<string>(CORES[0])
    const [hovered, setHovered] = useState<string | undefined>(VIS_DEFAULTS.core.hovered)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    const i = useRef<number>(0)
    console.log('rerender!', i.current)
    i.current++

    // load data and init vis renderer
    useEffect(() => {
        const initVisRenderer = async (canvas: HTMLCanvasElement): Promise<void> => {
            const basePath = `./data/${core}`
            const numMinerals = 9

            // fetch visualization textures / metadata
            const downscaledPaths = []
            const punchcardPaths = []
            for (let i = 0; i < numMinerals; i++) {
                downscaledPaths.push(`${basePath}/downscaled/${i}.png`)
                punchcardPaths.push(`${basePath}/punchcard/${i}.png`)
            }
            const [downscaledImgs, punchcardImgs, tileMetadata, idMetadata] = await Promise.all([
                Promise.all(downscaledPaths.map(p => loadImageAsync(p))),
                Promise.all(punchcardPaths.map(p => loadImageAsync(p))),
                fetch(`${basePath}/tile-metadata.json`).then(res => res.json()),
                fetch(`${basePath}/id-metadata.json`).then(res => res.json())
            ])

            setVis(
                new VisRenderer(
                    canvas,
                    downscaledImgs,
                    punchcardImgs,
                    tileMetadata,
                    idMetadata,
                    {
                        setHovered
                    }
                )
            )
        }

        if (!canvasRef.current) {
            throw new Error('No reference to canvas')
        }
        setVis(null)
        initVisRenderer(canvasRef.current)
    }, [core])

    useEffect(() => {
        if (!vis) { return }
        vis.setHovered(undefined)
    }, [vis])

    return (
        <main>
            <LoadIcon loading={!vis} showDelayMs={100} />
            <canvas ref={canvasRef} data-visible={!!vis}></canvas>
            <Vis vis={vis} />
            <div className={'interface'}>
                <MetadataHover core={core} hovered={hovered} />
                <div className={'top-bar'}>
                    <CoreVisSettings
                        vis={vis}
                        cores={CORES}
                        currentCore={core}
                        setCurrentCore={setCore}
                    />
                </div>
                <div className={'side-bar'}>
                    <CoreViewSliders vis={vis} />
                </div>
                <div className={'bottom-bar'}>
                    <MineralControls vis={vis} />
                </div>
            </div>
        </main>
    )
}

export default App

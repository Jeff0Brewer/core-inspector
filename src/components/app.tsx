import { useState, useEffect, useRef, ReactElement } from 'react'
import { loadImageAsync } from '../lib/load'
import { PiSpiralLight, PiArrowsHorizontalBold } from 'react-icons/pi'
import { RxDragHandleDots1, RxColumns } from 'react-icons/rx'
import { IoSearch } from 'react-icons/io5'
import { CoreViewMode, CoreShape } from '../vis/core'
import VerticalSlider from '../components/vertical-slider'
import ToggleSelect from '../components/toggle-select'
import MineralSelect from '../components/mineral-select'
import MineralBlend from '../components/mineral-blend'
import MetadataHover from '../components/metadata-hover'
import CoreSelect from '../components/core-select'
import LoadIcon from '../components/load-icon'
import Vis from '../components/vis'
import VisRenderer, { VIS_DEFAULTS } from '../vis/vis'
import '../styles/app.css'

const CORES = ['gt1', 'gt2', 'gt3']

function App (): ReactElement {
    const [vis, setVis] = useState<VisRenderer | null>(null)
    const [core, setCore] = useState<string>(CORES[0])
    const [mineral, setMineral] = useState<number>(VIS_DEFAULTS.mineral.index)
    const [shape, setShape] = useState<CoreShape>(VIS_DEFAULTS.core.shape)
    const [viewMode, setViewMode] = useState<CoreViewMode>(VIS_DEFAULTS.core.viewMode)
    const [spacing, setSpacing] = useState<[number, number]>(VIS_DEFAULTS.core.spacing)
    const [zoom, setZoom] = useState<number>(VIS_DEFAULTS.camera.zoom)
    const [hovered, setHovered] = useState<string | undefined>(VIS_DEFAULTS.core.hovered)

    const canvasRef = useRef<HTMLCanvasElement>(null)

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
                        setMineral,
                        setShape,
                        setViewMode,
                        setSpacing,
                        setZoom,
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
        vis.setMineral(mineral)
        vis.setShape(shape)
        vis.setViewMode(viewMode)
        vis.setSpacing(spacing)
        vis.setZoom(zoom)
        vis.setHovered(undefined)

        // don't include state variables in dependency array
        // since only want to set full vis state when vis initialized
        //
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [vis])

    return (
        <main>
            <LoadIcon loading={!vis} showDelayMs={100} />
            <canvas ref={canvasRef} data-visible={!!vis}></canvas>
            <Vis vis={vis} />
            <div className={'interface'}>
                <MetadataHover core={core} hovered={hovered} />
                <div className={'top-bar'}>
                    <ToggleSelect<CoreShape>
                        currValue={shape}
                        setValue={s => vis?.setShape(s)}
                        item0={{ value: 'column', icon: ICONS.column }}
                        item1={{ value: 'spiral', icon: ICONS.spiral }}
                    />
                    <ToggleSelect<CoreViewMode>
                        currValue={viewMode}
                        setValue={v => vis?.setViewMode(v)}
                        item0={{ value: 'downscaled', icon: ICONS.downscaled }}
                        item1={{ value: 'punchcard', icon: ICONS.punchcard }}
                    />
                    <CoreSelect
                        cores={CORES}
                        selected={core}
                        setSelected={setCore}
                    />
                </div>
                <div className={'side-bar'}>
                    <VerticalSlider
                        setValue={v => vis?.setZoom(v)}
                        currValue={zoom}
                        min={0}
                        max={1}
                        step={0.01}
                        label={'zoom'}
                        icon={ICONS.zoom}
                    />
                    <VerticalSlider
                        setValue={v => vis?.setSpacing([v, spacing[1]])}
                        currValue={0.5}
                        min={0}
                        max={1}
                        step={0.01}
                        label={'horizontal distance'}
                        icon={ICONS.horizontalDist}
                    />
                    <VerticalSlider
                        setValue={v => vis?.setSpacing([spacing[0], v])}
                        currValue={0.5}
                        min={0}
                        max={1}
                        step={0.01}
                        label={'vertical distance'}
                        icon={ICONS.verticalDist}
                    />
                </div>
                <div className={'bottom-bar'}>
                    <MineralSelect
                        minerals={MINERALS}
                        currMineral={mineral}
                        setMineral={m => vis?.setMineral(m)}
                    />
                    <MineralBlend
                        minerals={MINERALS}
                        currMineral={mineral}
                        setMineral={m => vis?.setMineral(m)}
                        setBlending={p => vis?.setBlending(p)}
                    />
                </div>
            </div>
        </main>
    )
}

const MINERALS = [
    'chlorite',
    'epidote',
    'prehnite',
    'zeolite',
    'amphibole',
    'pyroxene',
    'gypsum',
    'carbonate',
    'kaolinite-montmorillinite'
]

// TODO: get new icons for horizontal / vertical dist
const ICONS = {
    column: <RxColumns style={{ fontSize: '20px' }} />,
    spiral: <PiSpiralLight style={{ fontSize: '25px' }} />,
    downscaled: <div className={'downscaled-icon'}></div>,
    punchcard: <RxDragHandleDots1 style={{ fontSize: '25px' }} />,
    zoom: <IoSearch style={{ fontSize: '16px' }} />,
    horizontalDist: <div className={'distance-icon'}><PiArrowsHorizontalBold /></div>,
    verticalDist: <div className={'distance-icon'} style={{ transform: 'rotate(90deg)' }}><PiArrowsHorizontalBold /></div>
}

export default App

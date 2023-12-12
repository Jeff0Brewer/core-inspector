import { useState, useEffect, useRef, ReactElement } from 'react'
import { PiSpiralLight, PiArrowsHorizontalBold } from 'react-icons/pi'
import { RxDragHandleDots1, RxColumns } from 'react-icons/rx'
import { IoSearch } from 'react-icons/io5'
import { loadImageAsync } from '../lib/load'
import { COLUMN_SHAPE, SPIRAL_SHAPE, FullCoreViewMode } from '../vis/full-core'
import VerticalSlider from '../components/vertical-slider'
import ToggleSelect from '../components/toggle-select'
import MineralSelect from '../components/mineral-select'
import MineralBlend from '../components/mineral-blend'
import VisRenderer from '../vis/vis'
import '../styles/app.css'

function App (): ReactElement {
    const [currMineral, setCurrMineral] = useState<number>(0)
    const [currShape, setCurrShape] = useState<number>(0)
    const [currView, setCurrView] = useState<FullCoreViewMode>('downscaled')
    const [currZoom, setCurrZoom] = useState<number>(0.7)
    const [horizontalSpacing, setHorizontalSpacing] = useState<number>(0.5)
    const [verticalSpacing, setVerticalSpacing] = useState<number>(0.5)
    const [initialized, setInitialized] = useState<boolean>(false)

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
            setCurrView(visRef.current.fullCore.viewMode)
            setInitialized(true)
        }

        initVisRenderer(canvasRef.current)
    }, [])

    useEffect(() => {
        if (!initialized) { return }
        if (!visRef.current || !canvasRef.current) {
            throw new Error('Visualization renderer initialization failed')
        }
        return visRef.current.setupEventListeners(canvasRef.current, setCurrZoom)
    }, [initialized])

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

    const setView = (v: FullCoreViewMode): void => {
        visRef.current?.fullCore.setViewMode(v)
        setCurrView(v)
    }

    const setSpacingHorizontal = (s: number): void => {
        visRef.current?.setFullCoreSpacing(s, verticalSpacing)
        setHorizontalSpacing(s)
    }

    const setSpacingVertical = (s: number): void => {
        visRef.current?.setFullCoreSpacing(horizontalSpacing, s)
        setVerticalSpacing(s)
    }

    const setZoom = (t: number): void => {
        visRef.current?.setZoom(t)
        setCurrZoom(t)
    }

    const setBlending = (mags: Array<number>): void => {
        visRef.current?.setBlending(mags)
    }

    return (
        <main>
            <canvas ref={canvasRef}></canvas>
            <div className={'interface'}>
                <div className={'top-bar'}>
                    <ToggleSelect
                        currValue={currShape}
                        setValue={setShape}
                        item0={{ value: COLUMN_SHAPE, icon: ICONS.column }}
                        item1={{ value: SPIRAL_SHAPE, icon: ICONS.spiral }}
                    />
                    <ToggleSelect
                        currValue={currView}
                        setValue={setView}
                        item0={{ value: 'downscaled', icon: ICONS.downscaled }}
                        item1={{ value: 'punchcard', icon: ICONS.punchcard }}
                    />
                </div>
                <div className={'side-bar'}>
                    <VerticalSlider
                        setValue={v => setZoom(v)}
                        currValue={currZoom}
                        min={0}
                        max={1}
                        step={0.01}
                        label={'zoom'}
                        icon={ICONS.zoom}
                    />
                    <VerticalSlider
                        setValue={v => setSpacingHorizontal(v)}
                        currValue={0.5}
                        min={0}
                        max={1}
                        step={0.01}
                        label={'horizontal distance'}
                        icon={ICONS.horizontalDist}
                    />
                    <VerticalSlider
                        setValue={v => setSpacingVertical(v)}
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
                        currMineral={currMineral}
                        setMineral={setMineral}
                    />
                    <MineralBlend
                        minerals={MINERALS}
                        currMineral={currMineral}
                        setMineral={setMineral}
                        setBlending={setBlending}
                    />
                </div>
            </div>
        </main>
    )
}

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

const MINERALS = [
    'chlorite',
    'epidote',
    'prehnite',
    'zeolite',
    'amphibole',
    'pyroxene',
    'gypsum'
]

export default App

import { FC, useState, useEffect, useRef, ReactElement } from 'react'
import { PiSpiralLight, PiArrowsHorizontalBold } from 'react-icons/pi'
import { RxDragHandleDots1, RxColumns } from 'react-icons/rx'
import { loadImageAsync } from '../lib/load'
import { COLUMN_SHAPE, SPIRAL_SHAPE, FullCoreViewMode } from '../vis/full-core'
import VisRenderer from '../vis/vis'
import '../styles/app.css'

const App: FC = () => {
    const [currMineral, setCurrMineral] = useState<number>(0)
    const [currShape, setCurrShape] = useState<number>(0)
    const [currView, setCurrView] = useState<FullCoreViewMode>('downscaled')
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
        return visRef.current.setupEventListeners(canvasRef.current)
    }, [initialized])

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
    }

    return (
        <main>
            <canvas
                ref={canvasRef}
            ></canvas>
            <div className={'interface'}>
                <div className={'top-bar'}>
                    <ShapeSelect setShape={setShape} currShape={currShape} />
                    <ViewSelect setView={setView} currView={currView} />
                </div>
                <div className={'side-bar'}>
                    <VertSlider
                        label={'zoom'}
                        min={0}
                        max={1}
                        step={0.01}
                        value={0.7}
                        setValue={v => setZoom(v)}
                    />
                    <VertSlider
                        label={'horizontal distance'}
                        icon={horizontalIcon}
                        min={0}
                        max={1}
                        step={0.01}
                        value={0.5}
                        setValue={v => setSpacingHorizontal(v)}
                    />
                    <VertSlider
                        label={'vertical distance'}
                        icon={verticalIcon}
                        min={0}
                        max={1}
                        step={0.01}
                        value={0.5}
                        setValue={v => setSpacingVertical(v)}
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

type VertSliderProps = {
    label: string,
    icon?: ReactElement
    min: number,
    max: number,
    step?: number,
    value: number,
    setValue: (v: number) => void
}

const VertSlider: FC<VertSliderProps> = ({ label, icon, min, max, step, value, setValue }) => {
    return (
        <div className={'vertical-slider'}>
            <input
                type={'range'}
                min={min}
                max={max}
                step={step || 0.1}
                defaultValue={value}
                onChange={e => setValue(e.target.valueAsNumber)}
            />
            <p>{label}</p>
            { icon && <div>
                {icon}
            </div> }
        </div>
    )
}

type ShapeSelectProps = {
    setShape: (t: number) => void
    currShape: number
}

const ShapeSelect: FC<ShapeSelectProps> = ({ setShape, currShape }) => {
    return (
        <div className={'toggle-input'}>
            <button
                data-active={currShape === COLUMN_SHAPE}
                onClick={(): void => setShape(COLUMN_SHAPE)}
                style={{ fontSize: '20px' }}
            >
                {<RxColumns />}
            </button>
            <button
                data-active={currShape === SPIRAL_SHAPE}
                onClick={(): void => setShape(SPIRAL_SHAPE)}
                style={{ fontSize: '25px' }}
            >
                {<PiSpiralLight />}
            </button>
        </div>
    )
}

type ViewSelectProps = {
    setView: (v: FullCoreViewMode) => void,
    currView: FullCoreViewMode
}

const ViewSelect: FC<ViewSelectProps> = ({ setView, currView }) => {
    return (
        <div className={'toggle-input'}>
            <button
                data-active={currView === 'downscaled'}
                onClick={(): void => setView('downscaled')}
            >
                {<div className={'downscaled-icon'}></div>}
            </button>
            <button
                data-active={currView === 'punchcard'}
                onClick={(): void => setView('punchcard')}
                style={{ fontSize: '25px' }}

            >
                {<RxDragHandleDots1 />}
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

// temporary, create new icon
const horizontalIcon: ReactElement = (
    <div className={'distance-icon'}>
        <PiArrowsHorizontalBold />
    </div>
)
const verticalIcon: ReactElement = (
    <div className={'distance-icon'} style={{ transform: 'rotate(90deg)' }}>
        <PiArrowsHorizontalBold />
    </div>
)

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

import { useState, useEffect, useRef, ReactElement } from 'react'
import { PiSpiralLight, PiArrowsHorizontalBold } from 'react-icons/pi'
import { RxDragHandleDots1, RxColumns } from 'react-icons/rx'
import { IoSearch } from 'react-icons/io5'
import { MdColorLens } from 'react-icons/md'
import { loadImageAsync } from '../lib/load'
import { COLUMN_SHAPE, SPIRAL_SHAPE, FullCoreViewMode } from '../vis/full-core'
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
            <canvas
                ref={canvasRef}
            ></canvas>
            <div className={'interface'}>
                <div className={'top-bar'}>
                    <ToggleSelect
                        setValue={setShape}
                        currValue={currShape}
                        icon0={<RxColumns style={{ fontSize: '20px' }} />}
                        value0={COLUMN_SHAPE}
                        icon1={<PiSpiralLight style={{ fontSize: '25px' }} />}
                        value1={SPIRAL_SHAPE}
                    />
                    <ToggleSelect
                        setValue={setView}
                        currValue={currView}
                        icon0={<div className={'downscaled-icon'}></div>}
                        value0={'downscaled'}
                        icon1={<RxDragHandleDots1 style={{ fontSize: '25px' }} />}
                        value1={'punchcard'}
                    />
                </div>
                <div className={'side-bar'}>
                    <VertSlider
                        label={'zoom'}
                        icon={<IoSearch style={{ fontSize: '16px' }} />}
                        min={0}
                        max={1}
                        step={0.01}
                        value={currZoom}
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
                    setBlending={setBlending}
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

function VertSlider (
    { label, icon, min, max, step, value, setValue }: VertSliderProps
): ReactElement {
    const inputRef = useRef<HTMLInputElement>(null)
    useEffect(() => {
        if (!inputRef.current) { return }
        if (value !== inputRef.current.valueAsNumber) {
            inputRef.current.valueAsNumber = value
        }
    }, [value])
    return (
        <div className={'vertical-slider'}>
            <input
                ref={inputRef}
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

type ToggleSelectProps<T> = {
    setValue: (v: T) => void,
    currValue: T,
    icon0: ReactElement,
    value0: T,
    icon1: ReactElement,
    value1: T
}

function ToggleSelect<T, > (
    { setValue, currValue, value0, value1, icon0, icon1 }: ToggleSelectProps<T>
): ReactElement {
    return (
        <div className={'toggle-input'}>
            <button data-active={currValue === value0} onClick={() => setValue(value0)}>
                {icon0}
            </button>
            <button data-active={currValue === value1} onClick={() => setValue(value1)}>
                {icon1}
            </button>
        </div>
    )
}

type MineralSelectProps = {
    minerals: Array<string>,
    currMineral: number,
    setMineral: (i: number) => void,
    setBlending: (m: Array<number>) => void
}

function MineralSelect (
    { minerals, currMineral, setMineral, setBlending }: MineralSelectProps
): ReactElement {
    const [blendMags, setBlendMags] = useState<Array<number>>(Array(minerals.length).fill(1))

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
            <a
                className={'blend-button'}
                data-active={currMineral < 0}
                onClick={(): void => setMineral(-1)}
            >
                <MdColorLens />
            </a>
            { currMineral < 0 && <div className={'blend-menu'}>
                { minerals.map((name, i) => (
                    <div key={i}>
                        <p>{name}</p>
                        <input
                            type={'range'}
                            min={0}
                            max={1}
                            step={0.01}
                            defaultValue={blendMags[i]}
                            onChange={e => {
                                blendMags[i] = e.target.valueAsNumber
                                setBlendMags([...blendMags])
                                setBlending(blendMags)
                            }}
                        />
                    </div>
                ))}
            </div> }
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

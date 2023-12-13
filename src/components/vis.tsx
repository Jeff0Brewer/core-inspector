import { useState, useEffect, useRef, ReactElement } from 'react'
import { PiSpiralLight, PiArrowsHorizontalBold } from 'react-icons/pi'
import { RxDragHandleDots1, RxColumns } from 'react-icons/rx'
import { IoSearch } from 'react-icons/io5'
import { FullCoreViewMode, FullCoreShape } from '../vis/full-core'
import VerticalSlider from '../components/vertical-slider'
import ToggleSelect from '../components/toggle-select'
import MineralSelect from '../components/mineral-select'
import MineralBlend from '../components/mineral-blend'
import VisRenderer from '../vis/vis'
import '../styles/vis.css'

type VisProps = {
    vis: VisRenderer
}

function Vis ({ vis }: VisProps): ReactElement {
    const [mineral, setMineral] = useVisState<number>(0, v => vis.setCurrMineral(v))
    const [shape, setShape] = useVisState<FullCoreShape>('column', v => vis.fullCore.setShape(v))
    const [viewMode, setViewMode] = useVisState<FullCoreViewMode>('downscaled', v => vis.fullCore.setViewMode(v))
    const [spacing, setSpacing] = useVisState<[number, number]>([0.5, 0.5], v => vis.setFullCoreSpacing(...v))
    const [zoom, setZoom] = useVisState<number>(0.7, v => vis.setZoom(v))

    const frameIdRef = useRef<number>(-1)

    useEffect(() => {
        return vis.setupEventListeners()
    }, [vis])

    // start draw loop
    useEffect(() => {
        let lastT = 0
        const tick = (t: number): void => {
            const elapsed = (t - lastT) * 0.001
            lastT = t

            vis.draw(elapsed)

            frameIdRef.current = window.requestAnimationFrame(tick)
        }

        frameIdRef.current = window.requestAnimationFrame(tick)
        return () => {
            window.cancelAnimationFrame(frameIdRef.current)
        }
    }, [vis])

    return (
        <div className={'interface'}>
            <div className={'top-bar'}>
                <ToggleSelect
                    currValue={shape}
                    setValue={setShape}
                    item0={{ value: 'column', icon: ICONS.column }}
                    item1={{ value: 'spiral', icon: ICONS.spiral }}
                />
                <ToggleSelect
                    currValue={viewMode}
                    setValue={setViewMode}
                    item0={{ value: 'downscaled', icon: ICONS.downscaled }}
                    item1={{ value: 'punchcard', icon: ICONS.punchcard }}
                />
            </div>
            <div className={'side-bar'}>
                <VerticalSlider
                    setValue={v => setZoom(v)}
                    currValue={zoom}
                    min={0}
                    max={1}
                    step={0.01}
                    label={'zoom'}
                    icon={ICONS.zoom}
                />
                <VerticalSlider
                    setValue={v => setSpacing([v, spacing[1]])}
                    currValue={0.5}
                    min={0}
                    max={1}
                    step={0.01}
                    label={'horizontal distance'}
                    icon={ICONS.horizontalDist}
                />
                <VerticalSlider
                    setValue={v => setSpacing([spacing[0], v])}
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
                    setMineral={setMineral}
                />
                <MineralBlend
                    minerals={MINERALS}
                    currMineral={mineral}
                    setMineral={setMineral}
                    setBlending={v => vis.setBlending(v)}
                />
            </div>
        </div>
    )
}

function useVisState <T> (initial: T, visUpdate: (v: T) => void): [T, (v: T) => void] {
    const [value, setValueR] = useState<T>(initial)

    const setValue = (v: T): void => {
        setValueR(v)
        visUpdate(v)
    }

    return [value, setValue]
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

export default Vis

import { useState, useEffect, useRef, ReactElement } from 'react'
import { PiSpiralLight, PiArrowsHorizontalBold } from 'react-icons/pi'
import { RxDragHandleDots1, RxColumns } from 'react-icons/rx'
import { IoSearch } from 'react-icons/io5'
import { CoreViewMode, CoreShape } from '../vis/core'
import VerticalSlider from '../components/vertical-slider'
import ToggleSelect from '../components/toggle-select'
import MineralSelect from '../components/mineral-select'
import MineralBlend from '../components/mineral-blend'
import VisRenderer, { VIS_DEFAULTS } from '../vis/vis'
import '../styles/vis.css'

type VisProps = {
    vis: VisRenderer
}

function Vis ({ vis }: VisProps): ReactElement {
    const [mineral, setMineral] = useVisState<number>(
        VIS_DEFAULTS.mineral.index,
        v => vis.setCoreMineral(v)
    )
    const [shape, setShape] = useVisState<CoreShape>(
        VIS_DEFAULTS.core.shape,
        v => vis.setCoreShape(v)
    )
    const [viewMode, setViewMode] = useVisState<CoreViewMode>(
        VIS_DEFAULTS.core.viewMode,
        v => vis.setCoreViewMode(v)
    )
    const [spacing, setSpacing] = useVisState<[number, number]>(
        VIS_DEFAULTS.core.spacing,
        v => vis.setCoreSpacing(v)
    )
    const [zoom, setZoom, setZoomReact] = useVisState<number>(
        VIS_DEFAULTS.camera.zoom,
        v => vis.setZoom(v)
    )
    const [hovered, _, setHoveredReact] = useVisState<number>(
        VIS_DEFAULTS.core.hovered,
        v => vis.setHovered(v)
    )

    const frameIdRef = useRef<number>(-1)

    useEffect(() => {
        // use react only state setters since visualization state
        // already set inside event listener
        return vis.setupEventListeners(setZoomReact)
    }, [vis, setZoomReact])

    useEffect(() => {
        console.log('loop start')
        let lastT = 0
        const tick = (t: number): void => {
            const elapsed = (t - lastT) * 0.001
            lastT = t

            vis.draw(elapsed, setHoveredReact)
            frameIdRef.current = window.requestAnimationFrame(tick)
        }

        frameIdRef.current = window.requestAnimationFrame(tick)
        return () => {
            window.cancelAnimationFrame(frameIdRef.current)
        }
    }, [vis, setHoveredReact])

    return (
        <div className={'interface'}>
            <p style={{ position: 'absolute', zIndex: 200, padding: '10px' }}>{hovered}</p>
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

// hook to coordinate react and visualization state
// calls visUpdate closure with new state value on any call to setValue
// ensuring that visualization is updated at same time as react state
//
// also provides react only state setter which is useful when mutating
// state from inside visualization renderer
function useVisState <T> (initial: T, visUpdate: (v: T) => void): [T, (v: T) => void, (v: T) => void] {
    const [value, setValueReact] = useState<T>(initial)

    const setValue = (v: T): void => {
        setValueReact(v)
        visUpdate(v)
    }

    return [value, setValue, setValueReact]
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

export default Vis

import { useState, useEffect, ReactElement } from 'react'
import { PiArrowsHorizontalBold } from 'react-icons/pi'
import { IoSearch } from 'react-icons/io5'
import VerticalSlider from '../components/vertical-slider'
import VisRenderer, { VIS_DEFAULTS } from '../vis/vis'
import '../styles/core-view-sliders.css'

type CoreViewSlidersProps = {
    vis: VisRenderer | null
}

function CoreViewSliders (
    { vis }: CoreViewSlidersProps
): ReactElement {
    const [zoom, setZoom] = useState<number>(VIS_DEFAULTS.camera.zoom)
    const [spacing, setSpacing] = useState<[number, number]>(VIS_DEFAULTS.core.spacing)

    useEffect(() => {
        if (!vis) { return }
        vis.uiState.setZoom = setZoom
        vis.uiState.setSpacing = setSpacing

        vis.setZoom(zoom)
        vis.setSpacing(spacing)

        // don't include state vars in dependency array
        // since only want to reset state when vis re-initialized
        //
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [vis])

    return <>
        <VerticalSlider
            currValue={zoom}
            setValue={v => vis?.setZoom(v)}
            min={0}
            max={1}
            step={0.01}
            label={'zoom'}
            icon={ICONS.zoom}
        />
        <VerticalSlider
            currValue={spacing[0]}
            setValue={v => vis?.setSpacing([v, spacing[1]])}
            min={0}
            max={1}
            step={0.01}
            label={'horizontal distance'}
            icon={ICONS.horizontalDist}
        />
        <VerticalSlider
            currValue={spacing[1]}
            setValue={v => vis?.setSpacing([spacing[0], v])}
            min={0}
            max={1}
            step={0.01}
            label={'vertical distance'}
            icon={ICONS.verticalDist}
        />
    </>
}

const ICONS = {
    zoom: <IoSearch style={{ fontSize: '16px' }} />,
    horizontalDist: <div className={'distance-icon'}><PiArrowsHorizontalBold /></div>,
    verticalDist: <div className={'distance-icon'} style={{ transform: 'rotate(90deg)' }}><PiArrowsHorizontalBold /></div>
}

export default CoreViewSliders

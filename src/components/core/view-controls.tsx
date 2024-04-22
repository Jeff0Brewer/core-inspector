import React, { useState, useEffect, ReactElement } from 'react'
import { PiArrowsHorizontalBold } from 'react-icons/pi'
import { IoSearch } from 'react-icons/io5'
import VerticalSlider from '../../components/generic/vertical-slider'
import CoreRenderer from '../../vis/core'
import styles from '../../styles/core/view-sliders.module.css'

type ViewControlsProps = {
    vis: CoreRenderer | null
}

const ViewControls = React.memo((
    { vis }: ViewControlsProps
): ReactElement => {
    const [zoom, setZoom] = useState<number>(0.5)
    const [spacing, setSpacing] = useState<[number, number]>([0.5, 0.5])

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

    return (
        <div className={styles.sliders}>
            <VerticalSlider
                value={zoom}
                setValue={v => vis?.setZoom(v)}
                label={'zoom'}
                icon={ICONS.zoom}
                min={0}
                max={1}
                step={0.01}
            />
            <VerticalSlider
                value={spacing[0]}
                setValue={v => vis?.setSpacing([v, spacing[1]])}
                label={'horizontal distance'}
                icon={ICONS.horizontalDist}
                min={0}
                max={1}
                step={0.002}
            />
            <VerticalSlider
                value={spacing[1]}
                setValue={v => vis?.setSpacing([spacing[0], v])}
                label={'vertical distance'}
                icon={ICONS.verticalDist}
                min={0}
                max={1}
                step={0.002}
            />
        </div>
    )
})

const ICONS = {
    zoom: <IoSearch style={{ fontSize: '16px' }} />,
    horizontalDist: <div className={styles.distanceIcon}><PiArrowsHorizontalBold /></div>,
    verticalDist: <div className={styles.distanceIcon} style={{ transform: 'rotate(90deg)' }}><PiArrowsHorizontalBold /></div>
}

export default ViewControls

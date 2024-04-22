import React, { ReactElement } from 'react'
import { PiArrowsHorizontalBold } from 'react-icons/pi'
import { IoSearch } from 'react-icons/io5'
import { getScale } from '../../lib/util'
import VerticalSlider from '../../components/generic/vertical-slider'
import styles from '../../styles/part/view-controls.module.css'

type ViewControlsProps = {
    zoom: number,
    spacing: number,
    setZoom: (z: number) => void,
    setSpacing: (s: number) => void,
    channelWidth: number
}

const ViewControls = React.memo((
    { zoom, spacing, setZoom, setSpacing, channelWidth }: ViewControlsProps
): ReactElement => {
    return (
        <div className={styles.viewControls}>
            <h2 className={styles.header}>
                view settings
            </h2>
            <div className={styles.sliders}>
                <VerticalSlider
                    value={spacing}
                    setValue={setSpacing}
                    label={'horizontal distance'}
                    icon={ICONS.horizontalDist}
                    height={'100px'}
                    min={0}
                    max={1}
                    step={0.01}
                />
                <div>
                    <p className={styles.scale}>
                        {getScale(channelWidth)}
                    </p>
                    <VerticalSlider
                        value={zoom}
                        setValue={setZoom}
                        label={'zoom single track'}
                        icon={ICONS.zoom}
                        height={'180px'}
                        min={0}
                        max={1}
                        step={0.01}
                    />
                </div>
            </div>
        </div>
    )
})

const ICONS = {
    zoom: <IoSearch style={{ fontSize: '16px' }} />,
    horizontalDist: <div className={styles.distanceIcon}><PiArrowsHorizontalBold /></div>
}

export default ViewControls

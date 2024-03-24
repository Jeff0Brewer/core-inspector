import { ReactElement } from 'react'
import { PiArrowsHorizontalBold } from 'react-icons/pi'
import { IoSearch } from 'react-icons/io5'
import VerticalSlider from '../../components/generic/vertical-slider'
import styles from '../../styles/part/view-controls.module.css'

type PartViewControlsProps = {
    zoom: number,
    spacing: number,
    setZoom: (z: number) => void,
    setSpacing: (s: number) => void
}

function PartViewControls (
    { zoom, spacing, setZoom, setSpacing }: PartViewControlsProps
): ReactElement {
    return (
        <div className={styles.viewControls}>
            <VerticalSlider
                value={spacing}
                setValue={setSpacing}
                label={'horizontal distance'}
                icon={ICONS.horizontalDist}
                min={0}
                max={1}
                step={0.01}
            />
            <VerticalSlider
                value={zoom}
                setValue={setZoom}
                label={'zoom single track'}
                icon={ICONS.zoom}
                min={0}
                max={1}
                step={0.01}
            />
        </div>
    )
}

const ICONS = {
    zoom: <IoSearch style={{ fontSize: '16px' }} />,
    horizontalDist: <div className={styles.distanceIcon}><PiArrowsHorizontalBold /></div>
}

export default PartViewControls

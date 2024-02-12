import { useState, useEffect, ReactElement } from 'react'
import { PiArrowsHorizontalBold } from 'react-icons/pi'
import { IoSearch } from 'react-icons/io5'
import { useCoreMetadata } from '../../hooks/core-metadata-context'
import VerticalSlider from '../../components/generic/vertical-slider'

type PartViewControlsProps = {
    part: string,
    zoom: number,
    setZoom: (z: number) => void,
    spacing: number,
    setSpacing: (s: number) => void,
    channelHeight: number
}

function PartViewControls (
    { part, zoom, setZoom, spacing, setSpacing, channelHeight }: PartViewControlsProps
): ReactElement {
    return (
        <div className={'vertical-controls'}>
            <ScaleRuler
                part={part}
                channelHeight={channelHeight}
            />
            <VerticalSlider
                value={zoom}
                setValue={setZoom}
                label={'zoom'}
                icon={ICONS.zoom}
                min={0}
                max={1}
                step={0.01}
            />
            <VerticalSlider
                value={spacing}
                setValue={setSpacing}
                label={'horizontal distance'}
                icon={ICONS.horizontalDist}
                min={0}
                max={1}
                step={0.01}
            />
        </div>
    )
}
type ScaleRulerProps = {
    part: string,
    channelHeight: number
}

function ScaleRuler (
    { part, channelHeight }: ScaleRulerProps
): ReactElement {
    const { depths } = useCoreMetadata()
    const [scale, setScale] = useState<number>(0)

    useEffect(() => {
        if (!depths || !channelHeight) { return }
        const cmPerPx = (depths[part].length * 100) / channelHeight
        setScale(cmPerPx * 75)
    }, [part, depths, channelHeight])

    return (
        <div className={'scale-ruler'}>
            <div className={'scale-ruler-center'}>
                <p>{scale.toFixed(1)} cm</p>
                <div></div>
                <p>75 px</p>
            </div>
        </div>
    )
}

const ICONS = {
    zoom: <IoSearch style={{ fontSize: '16px' }} />,
    horizontalDist: <div className={'distance-icon'}><PiArrowsHorizontalBold /></div>
}

export default PartViewControls

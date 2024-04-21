import { useState, ReactElement } from 'react'
import { useCoreMetadata } from '../../hooks/core-metadata-context'
import { StringMap } from '../../lib/util'
import PartRenderer from '../../vis/part'
import MineralChannels from '../../components/part/mineral-channels'
import CorePanel from '../../components/part/core-panel'
import SpectraPanel from '../../components/part/spectra-panel'
import {
    ScaleRepresentation,
    LineRepresentation,
    RectRepresentation,
    PunchcardRepresentation,
    ChannelPunchcardRepresentation
} from '../../components/part/scale-representations'

type ContentProps = {
    vis: PartRenderer | null,
    core: string,
    part: string,
    channels: StringMap<HTMLImageElement>,
    setPart: (p: string | null) => void,
    corePanelVisible: boolean
}

const CORE_PANEL_REPRESENTATIONS: Array<ScaleRepresentation> = [
    { element: LineRepresentation, fullScale: true },
    { element: RectRepresentation },
    { element: PunchcardRepresentation },
    { element: ChannelPunchcardRepresentation, largeWidth: true }
]

function Content (
    { vis, core, part, channels, setPart, corePanelVisible }: ContentProps
): ReactElement {
    const [scrollDepthTop, setScrollDepthTop] = useState<number>(0)
    const [scrollDepthBottom, setScrollDepthBottom] = useState<number>(0)
    const [selectedSpectrum, setSelectedSpectrum] = useState<Array<number>>([])
    const [spectrumPosition, setSpectrumPosition] = useState<[number, number]>([0, 0])
    const { ids } = useCoreMetadata()

    return (
        <>
            <CorePanel
                vis={vis}
                part={part}
                parts={ids}
                representations={CORE_PANEL_REPRESENTATIONS}
                setPart={setPart}
                finalTopDepth={scrollDepthTop}
                finalBottomDepth={scrollDepthBottom}
                visible={corePanelVisible}
            />
            <MineralChannels
                vis={vis}
                core={core}
                part={part}
                channels={channels}
                setDepthTop={setScrollDepthTop}
                setDepthBottom={setScrollDepthBottom}
                setSelectedSpectrum={setSelectedSpectrum}
                setSpectrumPosition={setSpectrumPosition}
            />
            <SpectraPanel
                selectedSpectrum={selectedSpectrum}
                spectrumPosition={spectrumPosition}
            />
        </>
    )
}

export default Content

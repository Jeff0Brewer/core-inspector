import { useState, ReactElement } from 'react'
import { useCoreMetadata } from '../../hooks/core-metadata-context'
import { StringMap } from '../../lib/util'
import PartRenderer from '../../vis/part'
import PartMineralChannels from '../../components/part/mineral-channels'
import CorePanel from '../../components/part/core-panel'
import SpectraPanel from '../../components/part/spectra-panel'
import {
    CoreRepresentation,
    CoreLineRepresentation,
    CoreRectRepresentation,
    CorePunchcardRepresentation,
    CoreChannelPunchcardRepresentation
} from '../../components/part/core-representations'

type PartContentProps = {
    vis: PartRenderer | null,
    core: string,
    part: string,
    channels: StringMap<HTMLImageElement>,
    setPart: (p: string | null) => void,
    corePanelVisible: boolean
}

const CORE_PANEL_REPRESENTATIONS: Array<CoreRepresentation> = [
    { element: CoreLineRepresentation, fullScale: true },
    { element: CoreRectRepresentation },
    { element: CorePunchcardRepresentation },
    { element: CoreChannelPunchcardRepresentation, largeWidth: true }
]

function PartContent (
    { vis, core, part, channels, setPart, corePanelVisible }: PartContentProps
): ReactElement {
    const [scrollDepthTop, setScrollDepthTop] = useState<number>(0)
    const [scrollDepthBottom, setScrollDepthBottom] = useState<number>(0)
    const [selectedSpectrum, setSelectedSpectrum] = useState<Array<number>>([])
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
            <PartMineralChannels
                vis={vis}
                core={core}
                part={part}
                channels={channels}
                setDepthTop={setScrollDepthTop}
                setDepthBottom={setScrollDepthBottom}
                setSelectedSpectra={setSelectedSpectrum}
            />
            <SpectraPanel selectedSpectrum={selectedSpectrum} />
        </>
    )
}

export default PartContent

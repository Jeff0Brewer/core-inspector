import React, { useState, ReactElement } from 'react'
import { PiCaretLeftBold, PiCaretRightBold } from 'react-icons/pi'
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
import styles from '../../styles/part/content.module.css'

type PartContentProps = {
    vis: PartRenderer | null,
    core: string,
    part: string,
    setPart: (p: string | null) => void,
    channels: StringMap<HTMLImageElement>
}

const CORE_PANEL_REPRESENTATIONS: Array<CoreRepresentation> = [
    { element: CoreLineRepresentation, fullScale: true },
    { element: CoreRectRepresentation },
    { element: CorePunchcardRepresentation },
    { element: CoreChannelPunchcardRepresentation, largeWidth: true }
]

function PartContent (
    { vis, core, part, setPart, channels }: PartContentProps
): ReactElement {
    const [scrollDepthTop, setScrollDepthTop] = useState<number>(0)
    const [scrollDepthBottom, setScrollDepthBottom] = useState<number>(0)
    const [corePanelVisible, setCorePanelVisible] = useState<boolean>(true)
    const [panelSpectra, setPanelSpectra] = useState<Array<number> | null>(null)
    const { ids } = useCoreMetadata()

    const gridParams = {
        '--core-panel-width': corePanelVisible ? '390px' : '0',
        '--spectra-panel-width': panelSpectra === null ? '0' : '300px'
    } as React.CSSProperties

    return (
        <div className={styles.content} style={gridParams}>
            <button
                className={styles.corePanelToggle}
                style={{ transform: `rotate(${corePanelVisible ? '0' : '180deg'})` }}
                onClick={(): void => setCorePanelVisible(!corePanelVisible)}
            >
                <PiCaretLeftBold />
            </button>
            <CorePanel
                vis={vis}
                part={part}
                parts={ids}
                representations={CORE_PANEL_REPRESENTATIONS}
                setPart={setPart}
                finalTopDepth={scrollDepthTop}
                finalBottomDepth={scrollDepthBottom}
            />
            <PartMineralChannels
                vis={vis}
                core={core}
                part={part}
                channels={channels}
                setDepthTop={setScrollDepthTop}
                setDepthBottom={setScrollDepthBottom}
                setPanelSpectra={setPanelSpectra}
            />
            <button
                className={styles.spectraPanelHide}
                style={{ opacity: panelSpectra === null ? '0' : '1' }}
                onClick={(): void => setPanelSpectra(null)}
            >
                <PiCaretRightBold />
            </button>
            <SpectraPanel spectra={panelSpectra} />
        </div>
    )
}

export default PartContent

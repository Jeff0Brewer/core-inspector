import React, { useState, useRef, useEffect, ReactElement } from 'react'
import { PiCaretLeftBold } from 'react-icons/pi'
import { useBlending } from '../../hooks/blend-context'
import { useRendererDrop } from '../../hooks/renderer-drop'
import { usePartIdContext } from '../../hooks/id-context'
import { useCoreMetadata } from '../../hooks/core-metadata-context'
import { loadImageAsync } from '../../lib/load'
import { StringMap, notNull } from '../../lib/util'
import { getCorePath, getAbundancePaths } from '../../lib/path'
import BlendIcon from '../../assets/blend-icon.svg'
import PartRenderer from '../../vis/part'
import InfoHeader from '../../components/part/info-header'
import BlendMenu from '../../components/blend-menu'
import MineralChannels from '../../components/part/mineral-channels'
import CorePanel, { RepresentationSettings, ScrollDepth } from '../../components/part/core-panel'
import SpectraPanel, { SpectrumInfo } from '../../components/part/spectra-panel'
import {
    LineRepresentation,
    RectRepresentation,
    PunchcardRepresentation,
    ChannelPunchcardRepresentation
} from '../../components/part/scale-representations'
import styles from '../../styles/part/layout.module.css'

const CORE_PANEL_REPRESENTATIONS: RepresentationSettings = [
    { element: LineRepresentation, fullScale: true },
    { element: RectRepresentation },
    { element: PunchcardRepresentation },
    { element: ChannelPunchcardRepresentation, largeWidth: true }
]

const PartView = React.memo((): ReactElement => {
    const [vis, setVis] = useState<PartRenderer | null>(null)
    const [mineralMaps, setMineralMaps] = useState<StringMap<HTMLImageElement | null>>({})
    const [selectedSpectrum, setSelectedSpectrum] = useState<SpectrumInfo>({})
    const [corePanelOpen, setCorePanelOpen] = useState<boolean>(true)
    const [blendMenuOpen, setBlendMenuOpen] = useState<boolean>(false)

    // Need ref to zoom slider to update core panel final window on slider input.
    const zoomSliderRef = useRef<HTMLInputElement>(null)
    const scrollDepthRef = useRef<ScrollDepth>({ topDepth: 0, bottomDepth: 0 })

    const { core, minerals, part, setPart } = usePartIdContext()
    const { partIds, tiles } = useCoreMetadata()

    // Ensures vis gl resources are freed when renderer changes.
    useRendererDrop(vis)

    // Applies blending on change to params or current mineral maps.
    useBlending(vis, mineralMaps)

    useEffect(() => {
        const initVis = async (): Promise<void> => {
            if (!partIds || !tiles) { return }
            const corePath = getCorePath(core)

            const punchcardPaths: StringMap<string> = {}
            minerals.forEach((mineral, i) => {
                punchcardPaths[mineral] = `${corePath}/punchcard/${i}.png`
            })

            const punchcardMaps = await Promise.all(
                minerals.map(mineral => loadImageAsync(punchcardPaths[mineral]))
            )

            const loadedPunchcardMaps = punchcardMaps.filter(notNull)
            if (loadedPunchcardMaps.length === punchcardMaps.length) {
                setVis(
                    new PartRenderer(
                        minerals,
                        loadedPunchcardMaps,
                        tiles,
                        partIds
                    )
                )
            }
        }

        initVis()
    }, [core, minerals, partIds, tiles])

    useEffect(() => {
        const getMineralChannels = async (): Promise<void> => {
            const channelPaths = getAbundancePaths(core, part, minerals)
            const channels = await Promise.all(
                minerals.map(mineral => loadImageAsync(channelPaths[mineral]))
            )

            const loadedChannels = channels.filter(notNull)
            if (loadedChannels.length === channels.length) {
                vis?.setPart(minerals, loadedChannels)
            }

            const mineralMaps: StringMap<HTMLImageElement | null> = {}
            minerals.forEach((mineral, i) => {
                mineralMaps[mineral] = channels[i]
            })

            setMineralMaps(mineralMaps)
        }

        getMineralChannels()
    }, [vis, core, part, minerals])

    // update pixel size in visualization for anti-aliasing
    useEffect(() => {
        if (!vis) { return }
        const updatePixelSize = (): void => {
            vis.punchcardPart.setPixelSize(
                1 / (window.innerHeight * window.devicePixelRatio)
            )
        }
        window.addEventListener('resize', updatePixelSize)
        return () => {
            window.removeEventListener('resize', updatePixelSize)
        }
    }, [vis])

    // to set css vars in tsx, must cast as React.CSSProperties
    const gridParams = {
        '--core-panel-width': corePanelOpen ? '390px' : '0'
    } as React.CSSProperties

    return (
        <div className={styles.partView} style={gridParams}>
            <div className={styles.topLeft}>
                <button
                    className={styles.closeButton}
                    onClick={() => setPart(null)}
                >
                    <p className={`${
                        styles.closeLabel} ${
                        !corePanelOpen && styles.closeLabelHidden
                    }`}>
                        back to global view
                    </p>
                    <PiCaretLeftBold />
                </button>
            </div>
            <InfoHeader />
            <button
                className={styles.corePanelToggle}
                onClick={() => setCorePanelOpen(!corePanelOpen)}
                style={{ transform: `rotate(${corePanelOpen ? '0' : '180deg'})` }}
            >
                <PiCaretLeftBold />
            </button>
            <CorePanel
                open={corePanelOpen}
                vis={vis}
                representations={CORE_PANEL_REPRESENTATIONS}
                scrollDepthRef={scrollDepthRef}
                zoomSliderRef={zoomSliderRef}
            />
            <MineralChannels
                vis={vis}
                mineralMaps={mineralMaps}
                setSelectedSpectrum={setSelectedSpectrum}
                scrollDepthRef={scrollDepthRef}
                zoomSliderRef={zoomSliderRef}
            />
            <SpectraPanel { ...selectedSpectrum } />
            <div className={styles.blendWrap}>
                <button
                    className={styles.blendToggle}
                    onClick={() => setBlendMenuOpen(!blendMenuOpen)}
                    data-active={blendMenuOpen}
                >
                    <img src={BlendIcon} />
                </button>
                <BlendMenu open={blendMenuOpen} />
            </div>
        </div>
    )
})

export default PartView

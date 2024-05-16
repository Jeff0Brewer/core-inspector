import React, { useState, useEffect, ReactElement } from 'react'
import { PiCaretLeftBold } from 'react-icons/pi'
import { useBlending } from '../../hooks/blend-context'
import { useRendererDrop } from '../../hooks/renderer-drop'
import { useCoreMetadata } from '../../hooks/core-metadata-context'
import { loadImageAsync } from '../../lib/load'
import { StringMap, notNull } from '../../lib/util'
import { getCorePath, getAbundancePaths } from '../../lib/path'
import { GenericPalette } from '../../lib/palettes'
import BlendIcon from '../../assets/blend-icon.svg'
import PartRenderer from '../../vis/part'
import InfoHeader from '../../components/part/info-header'
import BlendMenu from '../../components/blend-menu'
import MineralChannels from '../../components/part/mineral-channels'
import CorePanel from '../../components/part/core-panel'
import SpectraPanel, { SpectraPanelProps } from '../../components/part/spectra-panel'
import {
    ScaleRepresentation,
    LineRepresentation,
    RectRepresentation,
    PunchcardRepresentation,
    ChannelPunchcardRepresentation
} from '../../components/part/scale-representations'
import styles from '../../styles/part/layout.module.css'

const CORE_PANEL_REPRESENTATIONS: Array<ScaleRepresentation> = [
    { element: LineRepresentation, fullScale: true },
    { element: RectRepresentation },
    { element: PunchcardRepresentation },
    { element: ChannelPunchcardRepresentation, largeWidth: true }
]

type PartViewProps = {
    part: string,
    core: string,
    minerals: Array<string>,
    palettes: Array<GenericPalette>,
    setPart: (p: string | null) => void
}

const PartView = React.memo((
    { part, core, minerals, palettes, setPart }: PartViewProps
): ReactElement => {
    const [vis, setVis] = useState<PartRenderer | null>(null)
    const [mineralMaps, setMineralMaps] = useState<StringMap<HTMLImageElement | null>>({})
    const [scrollDepthTop, setScrollDepthTop] = useState<number>(0)
    const [scrollDepthBottom, setScrollDepthBottom] = useState<number>(0)
    const [selectedSpectrum, setSelectedSpectrum] = useState<SpectraPanelProps>({
        selectedSpectrum: null, spectrumPosition: [0, 0], maxMineral: 'chlorite' // TODO: remove this
    })
    const [corePanelOpen, setCorePanelOpen] = useState<boolean>(true)
    const [blendMenuOpen, setBlendMenuOpen] = useState<boolean>(false)
    const { partIds, tiles } = useCoreMetadata()

    // ensures vis gl resources are freed when renderer changes
    useRendererDrop(vis)

    // apply blending on change to params or current mineral maps
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

        setScrollDepthTop(0)
        setScrollDepthBottom(0)

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
                <p className={`${styles.closeLabel} ${!corePanelOpen && styles.closeLabelHidden}`}>
                    back to global view
                </p>
                <button
                    className={styles.closeButton}
                    onClick={() => setPart(null)}
                >
                    <PiCaretLeftBold />
                </button>
            </div>
            <InfoHeader core={core} part={part} />
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
                part={part}
                representations={CORE_PANEL_REPRESENTATIONS}
                setPart={setPart}
                finalTopDepth={scrollDepthTop}
                finalBottomDepth={scrollDepthBottom}
            />
            <MineralChannels
                vis={vis}
                core={core}
                part={part}
                minerals={minerals}
                mineralMaps={mineralMaps}
                setDepthTop={setScrollDepthTop}
                setDepthBottom={setScrollDepthBottom}
                setSelectedSpectrum={setSelectedSpectrum}
            />
            { selectedSpectrum &&
                <SpectraPanel { ...selectedSpectrum } /> }
            <div className={styles.blendWrap}>
                <button
                    className={styles.blendToggle}
                    onClick={() => setBlendMenuOpen(!blendMenuOpen)}
                    data-active={blendMenuOpen}
                >
                    <img src={BlendIcon} />
                </button>
                <BlendMenu
                    open={blendMenuOpen}
                    minerals={minerals}
                    palettes={palettes}
                />
            </div>
        </div>
    )
})

export default PartView

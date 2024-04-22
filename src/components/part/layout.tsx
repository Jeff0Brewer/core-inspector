import React, { useState, useEffect, ReactElement } from 'react'
import { PiCaretLeftBold } from 'react-icons/pi'
import { MdColorLens } from 'react-icons/md'
import { useBlending } from '../../hooks/blend-context'
import { useRendererDrop } from '../../hooks/renderer-drop'
import { useCoreMetadata } from '../../hooks/core-metadata-context'
import { loadImageAsync } from '../../lib/load'
import { StringMap } from '../../lib/util'
import { getCorePath, getAbundancePaths } from '../../lib/path'
import { GenericPalette } from '../../lib/palettes'
import PartRenderer from '../../vis/part'
import InfoHeader from '../../components/part/info-header'
import BlendMenu from '../../components/blend-menu'
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
    const [channels, setChannels] = useState<StringMap<HTMLImageElement>>({})
    const [scrollDepthTop, setScrollDepthTop] = useState<number>(0)
    const [scrollDepthBottom, setScrollDepthBottom] = useState<number>(0)
    const [selectedSpectrum, setSelectedSpectrum] = useState<Array<number>>([])
    const [spectrumPosition, setSpectrumPosition] = useState<[number, number]>([0, 0])
    const [corePanelOpen, setCorePanelOpen] = useState<boolean>(true)
    const [blendMenuOpen, setBlendMenuOpen] = useState<boolean>(false)
    const { ids } = useCoreMetadata()

    // ensures vis gl resources are freed when renderer changes
    useRendererDrop(vis)

    // apply blending on change to params or current channels
    useBlending(vis, channels)

    useEffect(() => {
        const initVis = async (): Promise<void> => {
            const corePath = getCorePath(core)

            const punchcardPaths: StringMap<string> = {}
            minerals.forEach((mineral, i) => {
                punchcardPaths[mineral] = `${corePath}/punchcard/${i}.png`
            })

            const [coreMaps, tileMetadata, idMetadata] = await Promise.all([
                Promise.all(minerals.map(mineral => loadImageAsync(punchcardPaths[mineral]))),
                fetch(`${corePath}/tile-metadata.json`).then(res => res.json()),
                fetch(`${corePath}/id-metadata.json`).then(res => res.json())
            ])

            setVis(new PartRenderer(minerals, coreMaps, tileMetadata, idMetadata.ids))
        }

        initVis()
    }, [core, minerals])

    useEffect(() => {
        if (!vis) { return }
        const getMineralChannels = async (): Promise<void> => {
            const channelPaths = getAbundancePaths(core, part, minerals)
            const channelMaps = await Promise.all(
                minerals.map(mineral => loadImageAsync(channelPaths[mineral]))
            )

            vis.setPart(minerals, channelMaps)
            const channels: StringMap<HTMLImageElement> = {}
            minerals.forEach((mineral, i) => {
                channels[mineral] = channelMaps[i]
            })
            setChannels(channels)
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

    const gridParams = {
        '--core-panel-width': corePanelOpen ? '390px' : '0'
    } as React.CSSProperties

    return (
        <div className={styles.partView} style={gridParams}>
            <div className={styles.topLeft}>
                <button className={styles.closeButton} onClick={() => setPart(null)}>
                    <PiCaretLeftBold />
                </button>
            </div>
            <InfoHeader core={core} part={part} />
            <button
                className={styles.corePanelToggle}
                style={{ transform: `rotate(${corePanelOpen ? '0' : '180deg'})` }}
                onClick={(): void => setCorePanelOpen(!corePanelOpen)}
            >
                <PiCaretLeftBold />
            </button>
            <CorePanel
                open={corePanelOpen}
                vis={vis}
                part={part}
                parts={ids}
                representations={CORE_PANEL_REPRESENTATIONS}
                setPart={setPart}
                finalTopDepth={scrollDepthTop}
                finalBottomDepth={scrollDepthBottom}
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
            <div className={styles.blendWrap}>
                <button
                    className={styles.blendToggle}
                    onClick={() => setBlendMenuOpen(!blendMenuOpen)}
                    data-active={blendMenuOpen}
                >
                    <MdColorLens />
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

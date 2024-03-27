import React, { useState, useEffect, ReactElement } from 'react'
import { PiCaretLeftBold, PiCaretRightBold } from 'react-icons/pi'
import { useBlending } from '../../hooks/blend-context'
import { useRendererDrop } from '../../hooks/renderer-drop'
import { loadImageAsync } from '../../lib/load'
import { padZeros, StringMap } from '../../lib/util'
import { getCoreId, getPartId } from '../../lib/ids'
import { GenericPalette } from '../../lib/palettes'
import PartRenderer from '../../vis/part'
import PartInfoHeader from '../../components/part/info-header'
import BlendMenuToggle from '../../components/part/blend-menu-toggle'
import PartContent from '../../components/part/part-content'
import styles from '../../styles/part/part-view.module.css'

type PartViewProps = {
    part: string,
    core: string,
    minerals: Array<string>,
    palettes: Array<GenericPalette>,
    setPart: (p: string | null) => void
}

function PartView (
    { part, core, minerals, palettes, setPart }: PartViewProps
): ReactElement {
    const [vis, setVis] = useState<PartRenderer | null>(null)
    const [channels, setChannels] = useState<StringMap<HTMLImageElement>>({})
    const [corePanelVisible, setCorePanelVisible] = useState<boolean>(true)

    // ensures vis gl resources are freed when renderer changes
    useRendererDrop(vis)

    // apply blending on change to params or current channels
    useBlending(vis, channels)

    useEffect(() => {
        const initVis = async (): Promise<void> => {
            const corePaths: StringMap<string> = {}
            minerals.forEach((mineral, i) => {
                corePaths[mineral] = `./data/${core}/punchcard/${i}.png`
            })

            const [coreMaps, tileMetadata, idMetadata] = await Promise.all([
                Promise.all(minerals.map(mineral => loadImageAsync(corePaths[mineral]))),
                fetch(`./data/${core}/tile-metadata.json`).then(res => res.json()),
                fetch(`./data/${core}/id-metadata.json`).then(res => res.json())
            ])

            setVis(new PartRenderer(minerals, coreMaps, tileMetadata, idMetadata.ids))
        }

        initVis()
    }, [core, minerals])

    useEffect(() => {
        if (!vis) { return }
        const getChannels = async (): Promise<void> => {
            const channelPaths = getAbundanceFilepaths(core, part, minerals)
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

        getChannels()
    }, [vis, core, part, minerals])

    const gridParams = {
        '--core-panel-width': corePanelVisible ? '390px' : '0'
    } as React.CSSProperties

    return <div className={styles.partView} style={gridParams}>
        <div className={styles.topLeft}>
            <button className={styles.closeButton} onClick={() => setPart(null)}>
                <PiCaretLeftBold />
            </button>
        </div>
        <PartInfoHeader core={core} part={part} />
        <button
            className={styles.corePanelToggle}
            style={{ transform: `rotate(${corePanelVisible ? '0' : '180deg'})` }}
            onClick={(): void => setCorePanelVisible(!corePanelVisible)}
        >
            <PiCaretLeftBold />
        </button>
        <PartContent
            vis={vis}
            core={core}
            part={part}
            setPart={setPart}
            channels={channels}
        />
        <BlendMenuToggle
            minerals={minerals}
            palettes={palettes}
        />
    </div>
}

function getAbundanceFilepaths (
    core: string,
    part: string,
    minerals: Array<string>
): StringMap<string> {
    const coreId = getCoreId(core)
    const partId = getPartId(part)
    const fullId = `${coreId}_${partId}`
    const extension = 'factor_1to001.abundance.global.png'

    const paths: StringMap<string> = {}

    minerals.forEach((mineral, index) => {
        const mineralId = padZeros(index, 2)
        const path = `./data/${core}/parts/${fullId}_${mineralId}.${extension}`
        paths[mineral] = path
    })

    return paths
}

export default PartView

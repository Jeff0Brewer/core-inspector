import { useState, useEffect, ReactElement } from 'react'
import { IoMdClose } from 'react-icons/io'
import { useRendererDrop } from '../../hooks/renderer-drop'
import { loadImageAsync } from '../../lib/load'
import { get2dContext, padZeros, StringMap } from '../../lib/util'
import { getCoreId, getPartId } from '../../lib/ids'
import { GenericPalette } from '../../lib/palettes'
import PartRenderer, { CanvasCtx } from '../../vis/part'
import PartInfoHeader from '../../components/part/info-header'
import PartMineralChannels from '../../components/part/mineral-channels'
import PartMineralControls from '../../components/part/mineral-controls'
import CorePanel, { CoreLineRepresentation, CoreRectRepresentation, CorePunchcardRepresentation } from '../../components/part/core-panel'
import '../../styles/single-part.css'

type PartViewProps = {
    part: string,
    core: string,
    minerals: Array<string>,
    palettes: Array<GenericPalette>,
    clearPart: () => void
}

function PartView (
    { part, core, minerals, palettes, clearPart }: PartViewProps
): ReactElement {
    const [vis, setVis] = useState<PartRenderer | null>(null)
    const [channels, setChannels] = useState<StringMap<CanvasCtx>>({})
    const [visible, setVisible] = useState<StringMap<boolean>>({})

    // ensures vis gl resources are freed when renderer changes
    useRendererDrop(vis)

    useEffect(() => {
        const visible: StringMap<boolean> = {}
        minerals.forEach(mineral => { visible[mineral] = true })
        setVisible(visible)

        const getChannels = async (): Promise<void> => {
            const partPaths = getAbundanceFilepaths(core, part, minerals)
            const corePaths: StringMap<string> = {}
            minerals.forEach((mineral, i) => {
                corePaths[mineral] = `./data/${core}/downscaled/${i}.png`
            })

            const [partMaps, coreMaps, tileMetadata] = await Promise.all([
                Promise.all(minerals.map(mineral => loadImageAsync(partPaths[mineral]))),
                Promise.all(minerals.map(mineral => loadImageAsync(corePaths[mineral]))),
                fetch(`./data/${core}/tile-metadata.json`).then(res => res.json())
            ])

            setVis(
                new PartRenderer(
                    minerals,
                    partMaps,
                    coreMaps,
                    tileMetadata
                )
            )

            const channels: StringMap<CanvasCtx> = {}
            minerals.forEach((mineral, i) => {
                channels[mineral] = imgToCanvasCtx(partMaps[i])
            })
            setChannels(channels)
        }

        getChannels()
    }, [core, part, minerals])

    return <>
        <button className={'close-button'} onClick={clearPart}>
            {ICONS.close}
        </button>
        <div className={'punch-label'}></div>
        <PartInfoHeader core={core} part={part} />
        <PartMineralChannels
            vis={vis}
            part={part}
            channels={channels}
            visible={visible}
        />
        <CorePanel
            vis={vis}
            part={part}
            parts={vis?.getParts() || []}
            representations={[
                CoreLineRepresentation,
                CoreRectRepresentation,
                CorePunchcardRepresentation,
                CorePunchcardRepresentation
            ]}
        />
        <PartMineralControls
            minerals={minerals}
            palettes={palettes}
            visible={visible}
            setVisible={setVisible}
        />
    </>
}

function imgToCanvasCtx (img: HTMLImageElement): CanvasCtx {
    const canvas = document.createElement('canvas')
    const ctx = get2dContext(canvas, { willReadFrequently: true })

    canvas.width = img.width
    canvas.height = img.height
    ctx.drawImage(img, 0, 0)

    return { canvas, ctx }
}

function getAbundanceFilepaths (
    core: string,
    part: string,
    minerals: Array<string>
): StringMap<string> {
    const coreId = getCoreId(core)
    const partId = getPartId(part)
    const fullId = `${coreId}_${partId}`
    const extension = 'factor_1to001.abundance.local.png'

    const paths: StringMap<string> = {}

    minerals.forEach((mineral, index) => {
        const mineralId = padZeros(index, 2)
        const path = `./data/${core}/parts/${fullId}_${mineralId}.${extension}`
        paths[mineral] = path
    })

    return paths
}

const ICONS = {
    close: <IoMdClose style={{ fontSize: '16px' }} />
}

export default PartView

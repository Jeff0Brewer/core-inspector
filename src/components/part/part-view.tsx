import { useState, useEffect, ReactElement } from 'react'
import { IoMdClose } from 'react-icons/io'
import { loadImageAsync } from '../../lib/load'
import { useBlending } from '../../hooks/blend-context'
import { padZeros, StringMap } from '../../lib/util'
import { getCoreId, getPartId } from '../../lib/ids'
import { GenericPalette } from '../../lib/palettes'
import PartRenderer from '../../vis/part'
import PartInfoHeader from '../../components/part/info-header'
import PartMineralChannels from '../../components/part/mineral-channels'
import PartMineralControls from '../../components/part/mineral-controls'
import PartViewControls from '../../components/part/view-controls'
import '../../styles/single-part.css'

const BLEND_KEY = '[blended]'

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
    const [channels, setChannels] = useState<StringMap<HTMLCanvasElement>>({})
    const [visible, setVisible] = useState<StringMap<boolean>>({})
    const [zoom, setZoom] = useState<number>(0.5)
    const [spacing, setSpacing] = useState<number>(0.5)
    const [channelHeight, setChannelHeight] = useState<number>(0)

    useBlending(vis)

    useEffect(() => {
        const visible: StringMap<boolean> = {}
        visible[BLEND_KEY] = true
        minerals.forEach(mineral => { visible[mineral] = true })
        setVisible(visible)

        const getChannels = async (): Promise<void> => {
            const paths = getAbundanceFilepaths(core, part, minerals)
            const imgs = await Promise.all(
                minerals.map(mineral => loadImageAsync(paths[mineral]))
            )

            const channels: StringMap<HTMLCanvasElement> = {}

            channels[BLEND_KEY] = document.createElement('canvas')
            channels[BLEND_KEY].width = imgs[0].width
            channels[BLEND_KEY].height = imgs[0].height
            setVis(new PartRenderer(channels[BLEND_KEY], minerals, imgs))

            minerals.forEach((mineral, i) => {
                channels[mineral] = imgToCanvas(imgs[i])
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
            channels={channels}
            visible={visible}
            zoom={zoom}
            spacing={spacing}
            setChannelHeight={setChannelHeight}
        />
        <PartViewControls
            core={core}
            part={part}
            zoom={zoom}
            setZoom={setZoom}
            spacing={spacing}
            setSpacing={setSpacing}
            channelHeight={channelHeight}
        />
        <PartMineralControls
            minerals={minerals}
            palettes={palettes}
            visible={visible}
            setVisible={setVisible}
        />
    </>
}

function imgToCanvas (img: HTMLImageElement): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) {
        throw new Error('Could not get 2d drawing context')
    }

    canvas.width = img.width
    canvas.height = img.height
    ctx.drawImage(img, 0, 0)

    return canvas
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

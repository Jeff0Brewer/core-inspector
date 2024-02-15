import { useState, useEffect, ReactElement } from 'react'
import { IoMdClose } from 'react-icons/io'
import { useRendererDrop } from '../../hooks/renderer-drop'
import { useBlendState } from '../../hooks/blend-context'
import { loadImageAsync } from '../../lib/load'
import { get2dContext, padZeros, StringMap } from '../../lib/util'
import { getCoreId, getPartId } from '../../lib/ids'
import { GenericPalette } from '../../lib/palettes'
import PartRenderer, { CanvasCtx } from '../../vis/part'
import PartInfoHeader from '../../components/part/info-header'
import PartMineralChannels from '../../components/part/mineral-channels'
import PartMineralControls from '../../components/part/mineral-controls'
import PartViewControls from '../../components/part/view-controls'
import CanvasRenderer from '../../components/generic/canvas-renderer'
import '../../styles/single-part.css'

type PartPunchcardProps = {
    vis: PartRenderer | null,
    part: string
}

function PartPunchcard (
    { vis, part }: PartPunchcardProps
): ReactElement {
    const [canvasCtx] = useState<CanvasCtx>(getCanvasCtx())

    const {
        magnitudes,
        visibilities,
        palette,
        saturation,
        threshold,
        mode,
        monochrome
    } = useBlendState()

    useEffect(() => {
        if (!vis) { return }
        const params = {
            magnitudes,
            visibilities,
            palette,
            saturation,
            threshold,
            mode,
            monochrome
        }
        vis.getPunchcard(part, params, canvasCtx)
    }, [vis, canvasCtx, part, magnitudes, visibilities, palette, saturation, threshold, mode, monochrome])

    return (
        <CanvasRenderer
            canvas={canvasCtx.canvas}
            width={'auto'}
            height={'auto'}
        />
    )
}

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
    const [blendChannel, setBlendChannel] = useState<CanvasCtx>(getCanvasCtx(0, 0))
    const [channels, setChannels] = useState<StringMap<CanvasCtx>>({})
    const [visible, setVisible] = useState<StringMap<boolean>>({})
    const [zoom, setZoom] = useState<number>(0.5)
    const [spacing, setSpacing] = useState<number>(0.5)
    const [channelHeight, setChannelHeight] = useState<number>(0)

    // ensures vis gl resources are freed when renderer changes
    useRendererDrop(vis)

    const {
        magnitudes,
        visibilities,
        palette,
        saturation,
        threshold,
        mode,
        monochrome
    } = useBlendState()

    // apply blending on change to params
    useEffect(() => {
        if (!vis) { return }
        const params = {
            magnitudes,
            visibilities,
            palette,
            saturation,
            threshold,
            mode,
            monochrome
        }
        vis.getBlended(params, blendChannel)
    }, [vis, blendChannel, magnitudes, visibilities, palette, saturation, threshold, mode, monochrome])

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

            const blendChannel = getCanvasCtx(partMaps[0].width, partMaps[0].height)
            setBlendChannel(blendChannel)
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
            blendChannel={blendChannel}
            channels={channels}
            visible={visible}
            zoom={zoom}
            spacing={spacing}
            setChannelHeight={setChannelHeight}
        />
        <div className={'side-display'}>
            <PartViewControls
                part={part}
                zoom={zoom}
                setZoom={setZoom}
                spacing={spacing}
                setSpacing={setSpacing}
                channelHeight={channelHeight}
            />
            <PartPunchcard vis={vis} part={part} />
        </div>
        <PartMineralControls
            minerals={minerals}
            palettes={palettes}
            visible={visible}
            setVisible={setVisible}
        />
    </>
}

function getCanvasCtx (width: number = 0, height: number = 0): CanvasCtx {
    const canvas = document.createElement('canvas')
    const ctx = get2dContext(canvas)

    canvas.width = width
    canvas.height = height

    return { canvas, ctx }
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

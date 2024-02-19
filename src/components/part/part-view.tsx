import { useState, useEffect, useRef, ReactElement } from 'react'
import { IoMdClose } from 'react-icons/io'
import { useRendererDrop } from '../../hooks/renderer-drop'
import { useCoreMetadata } from '../../hooks/core-metadata-context'
import { loadImageAsync } from '../../lib/load'
import { get2dContext, padZeros, StringMap } from '../../lib/util'
import { DepthMetadata } from '../../lib/metadata'
import { getCoreId, getPartId } from '../../lib/ids'
import { GenericPalette } from '../../lib/palettes'
import PartRenderer, { CanvasCtx } from '../../vis/part'
import PartInfoHeader from '../../components/part/info-header'
import PartMineralChannels from '../../components/part/mineral-channels'
import PartMineralControls from '../../components/part/mineral-controls'
import PartViewControls from '../../components/part/view-controls'
import '../../styles/single-part.css'

// type PartPunchcardProps = {
//     vis: PartRenderer | null,
//     part: string
// }
//
// function PartPunchcard (
//     { vis, part }: PartPunchcardProps
// ): ReactElement {
//     const [canvasCtx] = useState<CanvasCtx>(getCanvasCtx())
//     const [aspect, setAspect] = useState<number>(0)
//
//     const {
//         magnitudes,
//         visibilities,
//         palette,
//         saturation,
//         threshold,
//         mode,
//         monochrome
//     } = useBlendState()
//
//     useEffect(() => {
//         if (!vis) { return }
//         const aspect = vis.getPunchcard(part, canvasCtx, 15 * window.devicePixelRatio)
//         setAspect(aspect)
//     }, [vis, canvasCtx, part, magnitudes, visibilities, palette, saturation, threshold, mode, monochrome])
//
//     return (
//         <CanvasRenderer
//             canvas={canvasCtx.canvas}
//             width={'15px'}
//             height={`${15 * aspect}px`}
//         />
//     )
// }
//
// type PunchardSidebarProps = {
//     vis: PartRenderer | null,
//     ids: Array<string>,
//     part: string
// }
//
// function PunchcardSidebar (
//     { vis, ids, part }: PunchardSidebarProps
// ): ReactElement {
//     const [prev, setPrev] = useState<string>('')
//     const [next, setNext] = useState<string>('')
//
//     useEffect(() => {
//         const partInd = ids.indexOf(part)
//         setPrev(partInd === 0 ? '' : ids[partInd - 1])
//         setNext(partInd >= ids.length ? '' : ids[partInd + 1])
//     }, [part, ids])
//
//     return (
//         <div className={'punch-column'}>
//             { prev && <>
//                 <PartPunchcard vis={vis} part={prev} />
//                 <div className={'space-dot'}></div>
//             </>}
//             <PartPunchcard vis={vis} part={part} />
//             { next && <>
//                 <div className={'space-dot'}></div>
//                 <PartPunchcard vis={vis} part={next} />
//             </>}
//         </div>
//     )
// }

type CoreRepresentationProps = {
    topDepth?: number,
    bottomDepth?: number
}

type CoreRepresentation = (p: CoreRepresentationProps) => ReactElement

function CoreLineRepresentation (): ReactElement {
    return (
        <div className={'core-line'}>
        </div>
    )
}

type CoreDepthColumnProps = {
    part: string,
    depths: DepthMetadata,
    aspects: StringMap<number>,
    topDepth: number,
    bottomDepth: number,
    representations: Array<CoreRepresentation>
}

function CoreDepthColumn (
    { part, depths, aspects, topDepth, bottomDepth, representations }: CoreDepthColumnProps
): ReactElement {
    const [nextTopDepth, setNextTopDepth] = useState<number>(0)
    const [nextBottomDepth, setNextBottomDepth] = useState<number>(0)
    const nextWindowRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const nextWindow = nextWindowRef.current
        if (!nextWindow) {
            throw new Error('No reference to dom element')
        }

        const depthRange = bottomDepth - topDepth
        const nextDepthRange = Math.sqrt(depthRange)
        let center = depths[part].topDepth + depths[part].length * 0.5
        center += Math.max((nextDepthRange * 0.5) - center, 0)

        const nextTopDepth = center - nextDepthRange * 0.5
        const nextBottomDepth = center + nextDepthRange * 0.5

        setNextTopDepth(nextTopDepth)
        setNextBottomDepth(nextBottomDepth)

        nextWindow.style.top = `${(nextTopDepth - topDepth) / depthRange * 100}%`
        nextWindow.style.height = `${nextDepthRange / depthRange * 100}%`
    }, [part, topDepth, bottomDepth, depths])

    const Representation = representations[0]
    return <>
        <div className={'depth-column'}>
            <div className={'depth-window'} ref={nextWindowRef}></div>
            <Representation topDepth={topDepth} bottomDepth={bottomDepth} />
        </div>
        { representations.length > 1 &&
            <CoreDepthColumn
                part={part}
                depths={depths}
                aspects={aspects}
                topDepth={nextTopDepth}
                bottomDepth={nextBottomDepth}
                representations={representations.slice(1)}
            />
        }
    </>
}

type CorePanelProps = {
    vis: PartRenderer | null,
    part: string,
    representations: Array<CoreRepresentation>
}

function CorePanel (
    { vis, part, representations }: CorePanelProps
): ReactElement {
    const { topDepth, bottomDepth, depths } = useCoreMetadata()
    const [aspects, setAspects] = useState<StringMap<number>>({})

    useEffect(() => {
        if (!vis) { return }
        setAspects(vis.getPartAspects())
    }, [vis])

    return (
        <div className={'core-panel'}>
            <CoreDepthColumn
                part={part}
                depths={depths}
                aspects={aspects}
                topDepth={topDepth}
                bottomDepth={bottomDepth}
                representations={representations}
            />
        </div>
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
    const [channels, setChannels] = useState<StringMap<CanvasCtx>>({})
    const [visible, setVisible] = useState<StringMap<boolean>>({})
    const [zoom, setZoom] = useState<number>(0.5)
    const [spacing, setSpacing] = useState<number>(0.5)
    const [channelHeight, setChannelHeight] = useState<number>(0)

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
            <CorePanel
                vis={vis}
                part={part}
                representations={[
                    CoreLineRepresentation,
                    CoreLineRepresentation,
                    CoreLineRepresentation,
                    CoreLineRepresentation
                ]}
            />
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

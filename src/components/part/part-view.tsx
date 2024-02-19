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

const PART_WIDTH_M = 0.06

type CoreRepresentationProps = {
    parts: Array<string>,
    mToPx: number
}

type CoreRepresentation = (p: CoreRepresentationProps) => ReactElement

function CoreLineRepresentation (): ReactElement {
    return <>
        <div className={'core-line'}></div>
    </>
}

function CoreRectRepresentation (
    { parts, mToPx }: CoreRepresentationProps
): ReactElement {
    const { depths } = useCoreMetadata()

    return <>
        { parts.map((part, i) =>
            <div
                key={i}
                className={'part-rect'}
                style={{
                    width: `${PART_WIDTH_M * mToPx}px`,
                    height: `${depths[part].length * mToPx}px`,
                    backgroundColor: '#fff'
                }}
            >
            </div>
        ) }
    </>
}

type CoreScaleColumnProps = {
    part: string,
    parts: Array<string>,
    topDepth: number,
    bottomDepth: number,
    representations: Array<CoreRepresentation>,
    gapPx?: number
}

function CoreScaleColumn (
    { part, parts, topDepth, bottomDepth, representations, gapPx = 1 }: CoreScaleColumnProps
): ReactElement {
    const { depths } = useCoreMetadata()
    const [visibleParts, setVisibleParts] = useState<Array<string>>([])
    const [mToPx, setMToPx] = useState<number>(0)
    const [nextTopDepth, setNextTopDepth] = useState<number>(0)
    const [nextBottomDepth, setNextBottomDepth] = useState<number>(0)
    const columnRef = useRef<HTMLDivElement>(null)

    // get m / px scale of column
    useEffect(() => {
        const getScale = (): void => {
            const column = columnRef.current
            if (!column) { return }

            const heightM = bottomDepth - topDepth
            const heightPx = column.getBoundingClientRect().height
            setMToPx(heightPx / heightM)
        }

        getScale()

        window.addEventListener('resize', getScale)
        return () => {
            window.removeEventListener('resize', getScale)
        }
    }, [topDepth, bottomDepth])

    // get visible parts within depth range
    useEffect(() => {
        const visibleParts: Array<string> = []

        parts.forEach(part => {
            if (!depths[part]) { return }

            const partTopDepth = depths[part].topDepth
            const partBottomDepth = partTopDepth + depths[part].length
            if (partBottomDepth > topDepth && partTopDepth < bottomDepth) {
                visibleParts.push(part)
            }
        })

        setVisibleParts(visibleParts)
    }, [parts, depths, topDepth, bottomDepth])

    // get next column's depth range
    useEffect(() => {
        const depthRange = bottomDepth - topDepth
        const nextDepthRange = Math.sqrt(depthRange)

        const center = depths[part].topDepth + 0.5 * depths[part].length
        setNextTopDepth(center - 0.5 * nextDepthRange)
        setNextBottomDepth(center + 0.5 * nextDepthRange)
    }, [part, depths, topDepth, bottomDepth])

    const Representation = representations[0]
    return <>
        <div className={'scale-column'} ref={columnRef}>
            <div
                className={'representation-wrap'}
                style={{ gap: `${gapPx}px` }}
            >
                <Representation parts={visibleParts} mToPx={mToPx} />
            </div>
        </div>
        { representations.length > 1 &&
            <CoreScaleColumn
                part={part}
                parts={visibleParts}
                topDepth={nextTopDepth}
                bottomDepth={nextBottomDepth}
                representations={representations.slice(1)}
            />
        }
    </>
}

type CorePanelProps = {
    part: string,
    parts: Array<string>,
    representations: Array<CoreRepresentation>
}

function CorePanel (
    { part, parts, representations }: CorePanelProps
): ReactElement {
    const { topDepth, bottomDepth } = useCoreMetadata()

    return (
        <div className={'core-panel'}>
            <CoreScaleColumn
                part={part}
                parts={parts}
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
                part={part}
                parts={vis?.getParts() || []}
                representations={[
                    CoreLineRepresentation,
                    CoreRectRepresentation
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

import { useState, useEffect, useRef, ReactElement } from 'react'
import { IoMdClose } from 'react-icons/io'
import { useRendererDrop } from '../../hooks/renderer-drop'
import { useCoreMetadata } from '../../hooks/core-metadata-context'
import { loadImageAsync } from '../../lib/load'
import { get2dContext, padZeros, StringMap } from '../../lib/util'
import { getCoreId, getPartId } from '../../lib/ids'
import { GenericPalette } from '../../lib/palettes'
import PartRenderer, { CanvasCtx } from '../../vis/part'
import CanvasRenderer from '../../components/generic/canvas-renderer'
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

const PART_WIDTH_M = 0.0525

type CoreRepresentationProps = {
    vis: PartRenderer | null,
    part: string,
    parts: Array<string>,
    mToPx: number,
    setCenter: (c: number) => void,
    gap: number
}

type CoreRepresentation = (p: CoreRepresentationProps) => ReactElement

function CoreLineRepresentation (
    { part, setCenter }: CoreRepresentationProps
): ReactElement {
    const { topDepth, bottomDepth, depths } = useCoreMetadata()

    useEffect(() => {
        const center = depths[part].topDepth + 0.5 * depths[part].length
        const centerPercent = center / (bottomDepth - topDepth)
        setCenter(centerPercent)
    }, [part, depths, topDepth, bottomDepth, setCenter])

    return <>
        <div className={'core-line'}></div>
    </>
}

function CoreRectRepresentation (
    { part, parts, mToPx, gap, setCenter }: CoreRepresentationProps
): ReactElement {
    const { depths } = useCoreMetadata()
    const wrapRef = useRef<HTMLDivElement>(null)
    const partRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const getCenter = (): void => {
            const partDiv = partRef.current
            const wrapDiv = wrapRef.current
            if (!partDiv || !wrapDiv) { return }

            const partRect = partDiv.getBoundingClientRect()
            const wrapRect = wrapDiv.getBoundingClientRect()

            const partCenter = (partRect.top - wrapRect.top) + 0.5 * partRect.height
            const wrapHeight = wrapRect.height

            setCenter(partCenter / wrapHeight)
        }

        getCenter()
    })

    return (
        <div
            ref={wrapRef}
            className={'part-rect-wrap'}
            style={{ gap: `${gap}px` }}
        >
            { parts.map((id, i) => {
                const refProp = id === part ? { ref: partRef } : {}
                return <div
                    onMouseEnter={() => console.log(id)}
                    {...refProp}
                    key={i}
                    className={'part-rect'}
                    style={{
                        width: `${PART_WIDTH_M * mToPx}px`,
                        height: `${depths[id].length * mToPx}px`,
                        backgroundColor: '#fff'
                    }}
                >
                </div>
            }) }
        </div>
    )
}

function CorePunchcardRepresentation (
    { vis, part, parts, mToPx, gap, setCenter }: CoreRepresentationProps
): ReactElement {
    const [canvasCtxs, setCanvasCtxs] = useState<StringMap<CanvasCtx> | null>(null)
    const { depths } = useCoreMetadata()
    const wrapRef = useRef<HTMLDivElement>(null)
    const partRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const getCenter = (): void => {
            const partDiv = partRef.current
            const wrapDiv = wrapRef.current
            if (!partDiv || !wrapDiv) { return }

            const partRect = partDiv.getBoundingClientRect()
            const wrapRect = wrapDiv.getBoundingClientRect()

            const partCenter = (partRect.top - wrapRect.top) + 0.5 * partRect.height
            const wrapHeight = wrapRect.height

            setCenter(partCenter / wrapHeight)
        }

        getCenter()
    })

    useEffect(() => {
        if (parts.length === 0) { return }

        const canvasCtxs: StringMap<CanvasCtx> = {}
        for (const part of parts) {
            canvasCtxs[part] = getCanvasCtx()
        }
        setCanvasCtxs(canvasCtxs)
    }, [parts])

    useEffect(() => {
        if (!vis || !canvasCtxs) { return }
        for (const part of parts) {
            vis.getPunchcard(part, canvasCtxs[part], PART_WIDTH_M * mToPx * window.devicePixelRatio)
        }
    }, [parts, vis, mToPx, canvasCtxs])

    return (
        <div
            ref={wrapRef}
            className={'part-rect-wrap'}
            style={{ gap: `${gap}px` }}
        >
            { parts.map((id, i) => {
                const refProp = id === part ? { ref: partRef } : {}
                return <div
                    {...refProp}
                    key={i}
                    className={'part-rect'}
                >
                    { canvasCtxs !== null && <CanvasRenderer
                        canvas={canvasCtxs[id].canvas}
                        width={`${PART_WIDTH_M * mToPx}px`}
                        height={`${depths[id].length * mToPx}px`}
                    /> }
                </div>
            }) }
        </div>
    )
}

type CoreScaleColumnProps = {
    vis: PartRenderer | null,
    part: string,
    parts: Array<string>,
    topDepth: number,
    bottomDepth: number,
    representations: Array<CoreRepresentation>,
    gap?: number
}

function CoreScaleColumn (
    { vis, part, parts, topDepth, bottomDepth, representations, gap = 1 }: CoreScaleColumnProps
): ReactElement {
    const { depths } = useCoreMetadata()
    const [visibleParts, setVisibleParts] = useState<Array<string>>([])
    const [mToPx, setMToPx] = useState<number>(0)
    const [windowCenter, setWindowCenter] = useState<number>(0)
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
                style={{
                    transform: `translateY(${Math.min((0.5 - windowCenter) * 100, 0)}%)`
                }}
            >
                <div
                    className={'next-window'}
                    style={{
                        top: `${windowCenter * 100}%`,
                        height: `${(nextBottomDepth - nextTopDepth) * mToPx}px`
                    }}
                ></div>
                <Representation
                    vis={vis}
                    part={part}
                    parts={visibleParts}
                    mToPx={mToPx}
                    setCenter={setWindowCenter}
                    gap={gap}
                />
            </div>
        </div>
        { representations.length > 1 &&
            <CoreScaleColumn
                vis={vis}
                part={part}
                parts={visibleParts}
                topDepth={nextTopDepth}
                bottomDepth={nextBottomDepth}
                representations={representations.slice(1)}
                gap={gap * 2}
            />
        }
    </>
}

type CorePanelProps = {
    vis: PartRenderer | null,
    part: string,
    parts: Array<string>,
    representations: Array<CoreRepresentation>
}

function CorePanel (
    { vis, part, parts, representations }: CorePanelProps
): ReactElement {
    const { topDepth, bottomDepth } = useCoreMetadata()

    return (
        <div className={'core-panel'}>
            <CoreScaleColumn
                vis={vis}
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

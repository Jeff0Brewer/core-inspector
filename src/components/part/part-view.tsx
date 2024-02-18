import { useState, useEffect, useRef, ReactElement } from 'react'
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
    vis: PartRenderer | null,
    parts: Array<string>,
    aspects: StringMap<number>
}

function CoreRectRepresentation (
    { parts, aspects }: CoreRepresentationProps
): ReactElement {
    return <>
        { parts.map((part, i) =>
            <div
                className={'rect-part'}
                style={{ aspectRatio: aspects[part] }}
                onMouseEnter={() => console.log(part)}
                key={i}
            ></div>
        ) }
    </>
}

type CoreZoomLevelProps = {
    vis: PartRenderer | null,
    representations: Array<(p: CoreRepresentationProps) => ReactElement>
    part: string,
    parts: Array<string>,
    aspects: StringMap<number>,
    gap?: number
    width?: number
}

function CoreZoomLevel (
    { vis, representations, parts, part, aspects, gap = 1, width = 1 }: CoreZoomLevelProps
): ReactElement {
    const [visibleParts, setVisibleParts] = useState<Array<string>>([])
    const [columnHeight, setColumnHeight] = useState<number>(0)
    const columnRef = useRef<HTMLDivElement>(null)
    const representationRef = useRef<HTMLDivElement>(null)
    const nextWindowRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const getColumnHeight = (): void => {
            if (!columnRef.current) {
                throw new Error('No reference to column element')
            }
            const { height } = columnRef.current.getBoundingClientRect()
            setColumnHeight(height)
        }
        getColumnHeight()

        window.addEventListener('resize', getColumnHeight)
        return () => {
            window.removeEventListener('resize', getColumnHeight)
        }
    }, [])

    useEffect(() => {
        const representation = representationRef.current
        const nextWindow = nextWindowRef.current
        if (!representation || !nextWindow) {
            throw new Error('No reference to dom elements')
        }

        let top = 0
        const heights: StringMap<number> = {}
        const tops: StringMap<number> = {}
        for (let i = 0; i < parts.length; i++) {
            const height = width / aspects[parts[i]] + gap
            heights[parts[i]] = height
            tops[parts[i]] = top
            top += height
        }

        const center = tops[part] + heights[part] * 0.5
        const topBound = center - columnHeight * 0.5
        const bottomBound = center + columnHeight * 0.5

        const visibleParts = parts.filter(part => {
            const top = tops[part]
            const bottom = tops[part] + heights[part]
            return bottom > topBound && top < bottomBound
        })

        const firstPart = visibleParts[0]
        const lastPart = visibleParts[visibleParts.length - 1]
        const minTop = tops[firstPart]
        const maxBottom = (tops[lastPart] + heights[lastPart])
        const visibleHeight = maxBottom - minTop
        const overflow = visibleHeight - columnHeight

        representation.style.top = `-${overflow * 0.5}px`
        nextWindow.style.top = `${center - minTop}px`

        setVisibleParts(visibleParts)
    }, [part, parts, aspects, width, gap, columnHeight])

    const Representation = representations[0]
    return <>
        <div
            ref={columnRef}
            className={'core-column'}
        >
            <div
                ref={representationRef}
                className={'core-representation-wrap'}
                style={{ gap: `${gap}px` }}
            >
                <div ref={nextWindowRef} className={'next-window'}></div>
                { <Representation vis={vis} parts={visibleParts} aspects={aspects} /> }
            </div>
        </div>
        { representations.length > 1 && <CoreZoomLevel
            vis={vis}
            representations={representations.slice(1)}
            part={part}
            parts={visibleParts}
            aspects={aspects}
        /> }
    </>
}

type CorePanelProps = {
    vis: PartRenderer | null,
    representations: Array<(p: CoreRepresentationProps) => ReactElement>,
    part: string,
    parts: Array<string>
}

function CorePanel (
    { vis, representations, part, parts }: CorePanelProps
): ReactElement {
    const [aspects, setAspects] = useState<StringMap<number>>({})

    useEffect(() => {
        if (!vis) { return }
        const aspects: StringMap<number> = {}
        vis.getPartAspects(parts).forEach((aspect, i) => {
            aspects[parts[i]] = aspect
        })
        setAspects(aspects)
    }, [vis, parts])

    return (
        <div className={'core-panel'}>
            <CoreZoomLevel
                vis={vis}
                representations={representations}
                part={part}
                parts={parts}
                aspects={aspects}
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
    const [ids, setIds] = useState<Array<string>>([])
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

            setIds(Object.keys(tileMetadata.tiles))

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
                representations={[CoreRectRepresentation]}
                parts={ids}
                part={part}
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

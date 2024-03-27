import { useState, useRef, useEffect, ReactElement } from 'react'
import { BiCross } from 'react-icons/bi'
import { useCoreMetadata } from '../../hooks/core-metadata-context'
import { useBlendState } from '../../hooks/blend-context'
import { StringMap, getImageData, getCssColor } from '../../lib/util'
import { getCoreId, getPartId } from '../../lib/ids'
import { isToggleable, getBlendColor } from '../../vis/mineral-blend'
import PartRenderer from '../../vis/part'
import PartHoverInfo from '../../components/part/hover-info'
import PartViewControls from '../../components/part/view-controls'
import CanvasRenderer from '../../components/generic/canvas-renderer'
import AbundanceWorker from '../../workers/abundances?worker'
import SpectraWorker from '../../workers/spectra?worker'
import styles from '../../styles/part/mineral-channels.module.css'

const MIN_WIDTH_PX = 50

// TODO: simplify
type PartMineralChannelsProps = {
    vis: PartRenderer | null,
    core: string,
    part: string,
    channels: StringMap<HTMLImageElement>,
    setDepthTop: (d: number) => void,
    setDepthBottom: (d: number) => void,
    setPanelSpectra: (s: Array<number>) => void
}

function PartMineralChannels (
    { vis, core, part, channels, setDepthTop, setDepthBottom, setPanelSpectra }: PartMineralChannelsProps
): ReactElement {
    const { setVisibilities, visibilities, palette, monochrome } = useBlendState()

    const [imgDims, setImgDims] = useState<[number, number]>([0, 0])
    const [viewDims, setViewDims] = useState<[number, number]>([0, 0])
    const [viewGap, setViewGap] = useState<number>(0)

    const [zoom, setZoom] = useState<number>(0.25)
    const [spacing, setSpacing] = useState<number>(0.25)

    useEffect(() => {
        if (!vis) { return }
        setImgDims([vis.canvas.width, vis.canvas.height])
    }, [vis, channels])

    useEffect(() => {
        const [imgWidth, imgHeight] = imgDims
        if (!vis || !imgWidth || !imgHeight) { return }

        const viewWidth = zoom * (imgWidth - MIN_WIDTH_PX) + MIN_WIDTH_PX
        const viewHeight = viewWidth * imgHeight / imgWidth
        const viewGap = viewWidth * spacing

        setViewDims([viewWidth, viewHeight])
        setViewGap(viewGap)
    }, [channels, zoom, spacing, vis, imgDims])

    const width = `${viewDims[0]}px`
    const gap = `${viewGap}px`
    return <>
        <PartViewControls
            zoom={zoom}
            spacing={spacing}
            setZoom={setZoom}
            setSpacing={setSpacing}
            channelWidth={viewDims[0]}
        />
        <div className={styles.content}>
            <div className={styles.topLabels} style={{ gap }}>
                <p className={styles.topLabel} style={{ width }}>
                    [visual range]
                </p>
                <p className={styles.topLabel} style={{ width }}>
                    [blended]
                </p>
                { Object.keys(channels)
                    .map((mineral, i) =>
                        <p className={styles.topLabel} style={{ width }} key={i}>
                            {mineral}
                        </p>
                    ) }
            </div>
            <ChannelsView
                core={core}
                part={part}
                vis={vis}
                channels={channels}
                imgDims={imgDims}
                viewDims={viewDims}
                viewGap={viewGap}
                setDepthTop={setDepthTop}
                setDepthBottom={setDepthBottom}
                setPanelSpectra={setPanelSpectra}
            />
            <div className={styles.bottomLabels} style={{ gap }}>
                <div className={styles.bottomLabel} style={{ width }}>
                    <button className={styles.toggleButton}>
                        visual range
                    </button>
                </div>
                <div className={styles.bottomLabel} style={{ width }}>
                    <button className={styles.toggleButton}>
                        blended
                    </button>
                </div>
                { Object.keys(channels)
                    .map((mineral, i) =>
                        <div className={styles.bottomLabel} style={{ width }} key={i}>
                            <div
                                className={styles.blendColor}
                                style={{
                                    backgroundColor: getCssColor(
                                        getBlendColor(palette, visibilities, monochrome, mineral)
                                    )
                                }}
                            ></div>
                            <button
                                className={`${
                                    styles.blendButton} ${
                                    !isToggleable(mineral, palette, visibilities) && styles.disabled
                                }`}
                                onClick={() => {
                                    visibilities[mineral] = !visibilities[mineral]
                                    setVisibilities({ ...visibilities })
                                }}
                            >
                                {mineral}
                            </button>
                        </div>
                    ) }
            </div>
        </div>
    </>
}

type ChannelsViewProps = {
    core: string,
    part: string,
    vis: PartRenderer | null,
    channels: StringMap<HTMLImageElement>,
    imgDims: [number, number],
    viewDims: [number, number],
    viewGap: number,
    setDepthTop: (d: number) => void,
    setDepthBottom: (d: number) => void,
    setPanelSpectra: (s: Array<number>) => void
}

function ChannelsView (
    { core, part, vis, channels, imgDims, viewDims, viewGap, setDepthTop, setDepthBottom, setPanelSpectra }: ChannelsViewProps
): ReactElement {
    const [rgbPath, setRGBPath] = useState<string>('')
    const channelsRef = useRef<HTMLDivElement>(null)
    const { depths } = useCoreMetadata()

    const [mousePos, setMousePos] = useState<[number, number] | null>(null)

    const [abundances, setAbundances] = useState<StringMap<number>>({})
    const [abundanceWorker, setAbundanceWorker] = useState<Worker | null>(null)

    const [spectrum, setSpectrum] = useState<Array<number>>([])
    const [spectraWorker, setSpectraWorker] = useState<Worker | null>(null)

    useEffect(() => {
        setRGBPath(`./data/${core}/rgb/${getCoreId(core)}_${getPartId(part)}_rgb.png`)
    }, [core, part])

    useEffect(() => {
        const wrap = channelsRef.current
        if (!wrap) {
            throw new Error('No reference to content element')
        }

        const scroll = (): void => {
            const { scrollTop, scrollHeight, clientHeight } = wrap
            const topPercent = scrollTop / scrollHeight
            const bottomPercent = (scrollTop + clientHeight) / scrollHeight

            const { topDepth, length } = depths[part]
            setDepthTop(topPercent * length + topDepth)
            setDepthBottom(bottomPercent * length + topDepth)
        }

        scroll()

        wrap.addEventListener('scroll', scroll)
        return () => {
            wrap.removeEventListener('scroll', scroll)
        }
    }, [part, depths, setDepthTop, setDepthBottom, viewDims])

    useEffect(() => {
        const abundanceWorker = new AbundanceWorker()
        abundanceWorker.addEventListener('message', ({ data }) =>
            setAbundances(data.abundances)
        )
        setAbundanceWorker(abundanceWorker)

        const spectraWorker = new SpectraWorker()
        spectraWorker.addEventListener('message', ({ data }) => {
            setSpectrum(data.spectrum)
        })
        setSpectraWorker(spectraWorker)

        return () => {
            abundanceWorker.terminate()
            spectraWorker.terminate()
        }
    }, [])

    useEffect(() => {
        const numChannels = Object.keys(channels).length
        if (!abundanceWorker || !numChannels) { return }

        const imgData: StringMap<ImageData> = {}
        Object.entries(channels).forEach(([mineral, img]) => {
            imgData[mineral] = getImageData(img)
        })

        abundanceWorker.postMessage({ type: 'imgData', imgData, imgWidth: imgDims[0] })
    }, [abundanceWorker, channels, imgDims])

    useEffect(() => {
        const imgHeight = imgDims[1]
        if (!spectraWorker || !imgHeight) { return }

        spectraWorker.postMessage({ type: 'id', core, part, imgHeight })
    }, [spectraWorker, imgDims, core, part])

    useEffect(() => {
        if (!mousePos || !abundanceWorker || !spectraWorker) { return }
        const x = mousePos[0] / viewDims[0] * imgDims[0]
        const y = mousePos[1] / viewDims[1] * imgDims[1]

        abundanceWorker.postMessage({ type: 'mousePosition', x, y })
        spectraWorker.postMessage({ type: 'mousePosition', x, y })
    }, [abundanceWorker, spectraWorker, mousePos, viewDims, imgDims])

    const width = `${viewDims[0]}px`
    const height = `${viewDims[1]}px`
    const gap = `${viewGap}px`
    return (
        <div
            className={styles.channelsWrap}
            ref={channelsRef}
            onClick={() => setPanelSpectra(spectrum)}
        >
            <div className={styles.channels} style={{ gap }}>
                <MineralChannel
                    source={rgbPath}
                    width={width}
                    height={height}
                    mousePos={mousePos}
                    setMousePos={setMousePos}
                />
                { vis &&
                    <MineralChannel
                        source={vis.canvas}
                        width={width}
                        height={height}
                        mousePos={mousePos}
                        setMousePos={setMousePos}
                    /> }
                { Object.entries(channels)
                    .map(([_, img], i) =>
                        <MineralChannel
                            source={img.src}
                            width={width}
                            height={height}
                            mousePos={mousePos}
                            setMousePos={setMousePos}
                            key={i}
                        />
                    ) }
                <PartHoverInfo
                    abundances={abundances}
                    spectrum={spectrum}
                    visible={!!mousePos}
                />
            </div>
        </div>
    )
}

type MineralChannelProps = {
    source: HTMLCanvasElement | string,
    width: string,
    height: string,
    mousePos: [number, number] | null,
    setMousePos: (p: [number, number] | null) => void
}

function MineralChannel (
    { source, width, height, mousePos, setMousePos }: MineralChannelProps
): ReactElement {
    const channelRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const channel = channelRef.current
        if (!channel) {
            throw new Error('No reference to mineral channel')
        }

        const mousemove = (e: MouseEvent): void => {
            const { top, left } = channel.getBoundingClientRect()
            setMousePos([
                e.clientX - left,
                e.clientY - top
            ])
        }

        const clearMousePos = (): void => {
            setMousePos(null)
        }

        channel.addEventListener('mousemove', mousemove)
        channel.addEventListener('mouseleave', clearMousePos)
        window.addEventListener('wheel', clearMousePos)
        return () => {
            channel.removeEventListener('mousemove', mousemove)
            channel.removeEventListener('mouseleave', clearMousePos)
            window.removeEventListener('wheel', clearMousePos)
        }
    }, [setMousePos])

    return (
        <div className={styles.channel}>
            <div ref={channelRef}>
                { typeof source === 'string'
                    ? <img src={source} style={{ width, height }} draggable={false} />
                    : <CanvasRenderer canvas={source} width={width} height={height} /> }
            </div>
            { mousePos && <div
                className={styles.ghostCursor}
                style={{ left: `${mousePos[0]}px`, top: `${mousePos[1]}px` }}
            >
                {ICONS.cursor}
            </div> }
        </div>
    )
}

const ICONS = {
    cursor: <BiCross style={{ fontSize: '16px' }} />
}

export default PartMineralChannels

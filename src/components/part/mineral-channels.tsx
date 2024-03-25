import { useState, useRef, useEffect, ReactElement } from 'react'
import { BiCross } from 'react-icons/bi'
import { useCoreMetadata } from '../../hooks/core-metadata-context'
import { useBlendState } from '../../hooks/blend-context'
import { StringMap, getImageData, getCssColor } from '../../lib/util'
import { isToggleable, getBlendColor } from '../../vis/mineral-blend'
import PartRenderer from '../../vis/part'
import PartHoverInfo from '../../components/part/hover-info'
import PartViewControls from '../../components/part/view-controls'
import CanvasRenderer from '../../components/generic/canvas-renderer'
import AbundanceWorker from '../../workers/abundances?worker'
import SpectraWorker from '../../workers/spectra?worker'
import styles from '../../styles/part/mineral-channels.module.css'

const MIN_WIDTH_PX = 50

type PartMineralChannelsProps = {
    vis: PartRenderer | null,
    core: string,
    part: string,
    channels: StringMap<HTMLImageElement>,
    setDepthTop: (d: number) => void,
    setDepthBottom: (d: number) => void,
    setPanelSpectra: (s: Array<number> | null) => void
}

function PartMineralChannels (
    { vis, core, part, channels, setDepthTop, setDepthBottom, setPanelSpectra }: PartMineralChannelsProps
): ReactElement {
    const [imgWidth, setImgWidth] = useState<number>(0)
    const [imgHeight, setImgHeight] = useState<number>(0)
    const [viewWidth, setViewWidth] = useState<number>(0)
    const [viewHeight, setViewHeight] = useState<number>(0)
    const [viewGap, setViewGap] = useState<number>(0)
    const [zoom, setZoom] = useState<number>(0.25)
    const [spacing, setSpacing] = useState<number>(0.25)
    const [channelHeight, setChannelHeight] = useState<number>(0)
    const [mousePos, setMousePos] = useState<[number, number] | null>(null)

    const [abundances, setAbundances] = useState<StringMap<number>>({})
    const [abundanceWorker, setAbundanceWorker] = useState<Worker | null>(null)
    const [spectrum, setSpectrum] = useState<Array<number>>([])
    const [spectraWorker, setSpectraWorker] = useState<Worker | null>(null)

    const contentRef = useRef<HTMLDivElement>(null)
    const { depths } = useCoreMetadata()
    const { setVisibilities, visibilities, palette, monochrome } = useBlendState()

    // TODO: prevent attaching / removing handler on
    // spectrum / mousepos state change
    useEffect(() => {
        const mousedown = (): void => {
            if (spectrum.length > 0 && mousePos !== null) {
                setPanelSpectra(spectrum)
            }
        }
        window.addEventListener('mousedown', mousedown)
        return () => {
            window.removeEventListener('mousedown', mousedown)
        }
    }, [spectrum, setPanelSpectra, mousePos])

    useEffect(() => {
        if (!vis) { return }
        setImgWidth(vis.canvas.width)
        setImgHeight(vis.canvas.height)
    }, [vis, channels])

    useEffect(() => {
        const content = contentRef.current
        if (!content) {
            throw new Error('No reference to content element')
        }

        const scroll = (): void => {
            const { scrollTop, scrollHeight, clientHeight } = content
            const topPercent = scrollTop / scrollHeight
            const bottomPercent = (scrollTop + clientHeight) / scrollHeight

            const { topDepth, length } = depths[part]
            setDepthTop(topPercent * length + topDepth)
            setDepthBottom(bottomPercent * length + topDepth)
        }

        scroll()

        content.addEventListener('scroll', scroll)
        return () => {
            content.removeEventListener('scroll', scroll)
        }
    }, [part, depths, channelHeight, setDepthTop, setDepthBottom])

    useEffect(() => {
        if (!vis) { return }

        const channelWidth = zoom * (imgWidth - MIN_WIDTH_PX) + MIN_WIDTH_PX
        const channelGap = channelWidth * spacing
        setViewWidth(channelWidth)
        setViewGap(channelGap)

        const { width, height } = vis.canvas
        if (width) {
            const channelHeight = channelWidth * height / width
            setViewHeight(channelHeight)
            setChannelHeight(channelHeight)
        }
    }, [channels, zoom, spacing, vis, imgWidth, setChannelHeight])

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

        abundanceWorker.postMessage({ type: 'imgData', imgData, imgWidth })
    }, [abundanceWorker, channels, imgWidth])

    useEffect(() => {
        if (!spectraWorker || !imgHeight) { return }

        spectraWorker.postMessage({ type: 'id', core, part, imgHeight })
    }, [spectraWorker, imgHeight, core, part])

    useEffect(() => {
        if (!mousePos || !abundanceWorker || !spectraWorker) { return }
        const x = mousePos[0] / viewWidth * imgWidth
        const y = mousePos[1] / viewHeight * imgHeight

        abundanceWorker.postMessage({ type: 'mousePosition', x, y })
        spectraWorker.postMessage({ type: 'mousePosition', x, y })
    }, [abundanceWorker, spectraWorker, mousePos, viewWidth, viewHeight, imgWidth, imgHeight])

    const width = `${viewWidth}px`
    const height = `${viewHeight}px`
    const gap = `${viewGap}px`
    return <>
        <PartViewControls
            zoom={zoom}
            spacing={spacing}
            setZoom={setZoom}
            setSpacing={setSpacing}
            channelWidth={viewWidth}
        />
        <div className={styles.content}>
            <div className={styles.topLabels} style={{ gap }}>
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
            <div className={styles.channelsWrap} ref={contentRef}>
                <div className={styles.channels} style={{ gap }}>
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
            <div className={styles.bottomLabels} style={{ gap }}>
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
                    ? <img src={source} style={{ width, height }} />
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

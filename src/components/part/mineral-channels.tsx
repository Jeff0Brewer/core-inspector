import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, ReactElement, MutableRefObject } from 'react'
import { BiCross } from 'react-icons/bi'
import { useCoreMetadata } from '../../hooks/core-metadata-context'
import { useBlendState } from '../../hooks/blend-context'
import { StringMap, getImageData, getCssColor } from '../../lib/util'
import { getRgbPath } from '../../lib/path'
import { isToggleable, getBlendColor } from '../../vis/mineral-blend'
import PartRenderer from '../../vis/part'
import HoverInfo from '../../components/part/hover-info'
import ViewControls from '../../components/part/view-controls'
import CanvasRenderer from '../../components/generic/canvas-renderer'
import LoadIcon from '../../components/generic/load-icon'
import AbundanceWorker from '../../workers/abundances?worker'
import SpectraWorker from '../../workers/spectra?worker'
import styles from '../../styles/part/mineral-channels.module.css'

const MIN_WIDTH_PX = 50

// TODO: simplify
type MineralChannelsProps = {
    vis: PartRenderer | null,
    core: string,
    part: string,
    minerals: Array<string>,
    channels: StringMap<HTMLImageElement | null>,
    setDepthTop: (d: number) => void,
    setDepthBottom: (d: number) => void,
    setSelectedSpectrum: (s: Array<number> | null) => void,
    setSpectrumPosition: (p: [number, number]) => void
}

const MineralChannels = React.memo(({
    vis, core, part, minerals, channels,
    setDepthTop, setDepthBottom, setSelectedSpectrum, setSpectrumPosition
}: MineralChannelsProps): ReactElement => {
    const [zoom, setZoom] = useState<number>(0.25)
    const [spacing, setSpacing] = useState<number>(0.25)
    const [imgDims, setImgDims] = useState<[number, number]>([320, 3000])
    const [viewDims, setViewDims] = useState<[number, number]>([0, 0])
    const [viewGap, setViewGap] = useState<number>(0)
    const [loading, setLoading] = useState<boolean>(true)
    const { setVisibilities, visibilities, palette, monochrome } = useBlendState()

    useLayoutEffect(() => {
        const [imgWidth, imgHeight] = imgDims

        const viewWidth = zoom * (imgWidth - MIN_WIDTH_PX) + MIN_WIDTH_PX
        const viewHeight = viewWidth * imgHeight / imgWidth
        const viewGap = viewWidth * spacing

        setViewDims([viewWidth, viewHeight])
        setViewGap(viewGap)
    }, [channels, zoom, spacing, imgDims])

    useEffect(() => {
        setLoading(true)
    }, [part])

    useEffect(() => {
        const imgs = Object.values(channels)
        for (let i = 0; i < imgs.length; i++) {
            const img = imgs[i]
            if (img !== null) {
                setImgDims([img.width, img.height])
                break
            }
        }

        if (imgs.length !== 0) {
            setLoading(false)
        }
    }, [channels])

    const width = `${viewDims[0]}px`
    const gap = `${viewGap}px`
    return <>
        <ViewControls
            zoom={zoom}
            spacing={spacing}
            setZoom={setZoom}
            setSpacing={setSpacing}
            channelWidth={viewDims[0]}
        />
        <div className={styles.content} data-loading={loading}>
            <LoadIcon loading={loading} showDelayMs={100} />
            <div className={styles.topLabels} style={{ gap }}>
                <p className={styles.topLabel} style={{ width }}>
                    [visual range]
                </p>
                <p className={styles.topLabel} style={{ width }}>
                    [blended]
                </p>
                { minerals.map((mineral, i) =>
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
                setSelectedSpectrum={setSelectedSpectrum}
                setSpectrumPosition={setSpectrumPosition}
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
                { minerals.map((mineral, i) =>
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
})

type ChannelsViewProps = {
    core: string,
    part: string,
    vis: PartRenderer | null,
    channels: StringMap<HTMLImageElement | null>,
    imgDims: [number, number],
    viewDims: [number, number],
    viewGap: number,
    setDepthTop: (d: number) => void,
    setDepthBottom: (d: number) => void,
    setSelectedSpectrum: (s: Array<number> | null) => void,
    setSpectrumPosition: (p: [number, number]) => void
}

const ChannelsView = React.memo(({
    core, part, vis, channels, imgDims, viewDims, viewGap,
    setDepthTop, setDepthBottom, setSelectedSpectrum, setSpectrumPosition
}: ChannelsViewProps): ReactElement => {
    const [rgbPath, setRGBPath] = useState<string>('')
    const [abundanceWorker, setAbundanceWorker] = useState<Worker | null>(null)
    const [spectraWorker, setSpectraWorker] = useState<Worker | null>(null)
    const [hoverInfoVisible, setHoverInfoVisible] = useState<boolean>(false)
    const channelsRef = useRef<HTMLDivElement>(null)
    const mousePosRef = useRef<[number, number] | null>(null)
    const { depths } = useCoreMetadata()

    useEffect(() => {
        const abundanceWorker = new AbundanceWorker()
        const spectraWorker = new SpectraWorker()

        setAbundanceWorker(abundanceWorker)
        setSpectraWorker(spectraWorker)

        return () => {
            abundanceWorker.terminate()
            spectraWorker.terminate()
        }
    }, [])

    useEffect(() => {
        setRGBPath(getRgbPath(core, part))
    }, [core, part])

    useEffect(() => {
        if (!depths?.[part]) { return }
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
        const numChannels = Object.keys(channels).length
        if (!abundanceWorker || !numChannels) { return }

        const imgData: StringMap<ImageData | null> = {}
        Object.entries(channels).forEach(([mineral, img]) => {
            imgData[mineral] = img === null ? null : getImageData(img)
        })

        abundanceWorker.postMessage({ type: 'imgData', imgData, imgWidth: imgDims[0] })
    }, [abundanceWorker, channels, imgDims])

    useEffect(() => {
        const imgHeight = imgDims[1]
        if (!spectraWorker || !imgHeight) { return }

        spectraWorker.postMessage({ type: 'id', core, part, imgHeight })
    }, [spectraWorker, imgDims, core, part])

    useEffect(() => {
        const channelsWrap = channelsRef.current
        if (!abundanceWorker || !spectraWorker || !channelsWrap) { return }

        const mousemove = (): void => {
            if (!mousePosRef.current) {
                setHoverInfoVisible(false)
                return
            }

            setHoverInfoVisible(true)

            const [mouseX, mouseY] = mousePosRef.current
            const x = mouseX / viewDims[0] * imgDims[0]
            const y = mouseY / viewDims[1] * imgDims[1]
            abundanceWorker.postMessage({ type: 'mousePosition', x, y })
            spectraWorker.postMessage({ type: 'mousePosition', x, y })
        }

        const hideHoverInfo = (): void => { setHoverInfoVisible(false) }

        channelsWrap.addEventListener('mouseleave', hideHoverInfo)
        channelsWrap.addEventListener('wheel', hideHoverInfo)
        window.addEventListener('mousemove', mousemove)
        return () => {
            channelsWrap.removeEventListener('mouseleave', hideHoverInfo)
            channelsWrap.removeEventListener('wheel', hideHoverInfo)
            window.removeEventListener('mousemove', mousemove)
        }
    }, [abundanceWorker, spectraWorker, viewDims, imgDims])

    const selectSpectrum = useCallback(() => {
        if (!spectraWorker) { return }
        spectraWorker.postMessage({ type: 'mouseClick' })
    }, [spectraWorker])

    const width = `${viewDims[0]}px`
    const height = `${viewDims[1]}px`
    const gap = `${viewGap}px`
    return (
        <div className={styles.channelsWrap} ref={channelsRef}>
            <div className={styles.channels} style={{ gap }}>
                <MineralChannel
                    source={rgbPath}
                    width={width}
                    height={height}
                    mousePosRef={mousePosRef}
                    onClick={selectSpectrum}
                />
                <MineralChannel
                    source={vis?.partMinerals ? vis.canvas : 'none'}
                    width={width}
                    height={height}
                    mousePosRef={mousePosRef}
                    onClick={selectSpectrum}
                />
                { Object.entries(channels)
                    .map(([_, img], i) =>
                        <MineralChannel
                            source={img?.src || 'none'}
                            width={width}
                            height={height}
                            mousePosRef={mousePosRef}
                            onClick={selectSpectrum}
                            key={i}
                        />
                    ) }
                <HoverInfo
                    visible={hoverInfoVisible}
                    abundanceWorker={abundanceWorker}
                    spectrumWorker={spectraWorker}
                    setSelectedSpectrum={setSelectedSpectrum}
                    setSpectrumPosition={setSpectrumPosition}
                />
            </div>
        </div>
    )
})

type MineralChannelProps = {
    source: HTMLCanvasElement | string,
    width: string,
    height: string,
    mousePosRef: MutableRefObject<[number, number] | null>,
    onClick: () => void
}

const MineralChannel = React.memo((
    { source, width, height, mousePosRef, onClick }: MineralChannelProps
): ReactElement => {
    const [loadError, setLoadError] = useState<boolean>(false)
    const channelRef = useRef<HTMLDivElement>(null)
    const cursorRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        setLoadError(false)
    }, [source])

    useEffect(() => {
        const channel = channelRef.current
        const cursor = cursorRef.current
        if (!channel || !cursor) {
            throw new Error('No reference to dom elements')
        }

        const mousemove = (e: MouseEvent): void => {
            const { top, left } = channel.getBoundingClientRect()
            mousePosRef.current = [
                e.clientX - left,
                e.clientY - top
            ]
        }

        const updateCursor = (): void => {
            if (mousePosRef.current) {
                const [x, y] = mousePosRef.current
                cursor.style.left = `${x}px`
                cursor.style.top = `${y}px`
                cursor.style.opacity = '1'
            } else {
                cursor.style.opacity = '0'
            }
        }

        const clearMousePos = (): void => {
            mousePosRef.current = null
            cursor.style.opacity = '0'
        }

        channel.addEventListener('mousemove', mousemove)
        channel.addEventListener('mouseleave', clearMousePos)
        window.addEventListener('wheel', clearMousePos)
        window.addEventListener('mousemove', updateCursor)
        return () => {
            channel.removeEventListener('mousemove', mousemove)
            channel.removeEventListener('mouseleave', clearMousePos)
            window.removeEventListener('wheel', clearMousePos)
            window.removeEventListener('mousemove', updateCursor)
        }
    }, [mousePosRef])

    return (
        <div className={styles.channel} onClick={onClick}>
            <div ref={channelRef}>
                { typeof source !== 'string' &&
                    <CanvasRenderer
                        canvas={source}
                        width={width}
                        height={height}
                    /> }
                { !loadError && typeof source === 'string' &&
                     <img
                         src={source}
                         style={{ width, height }}
                         draggable={false}
                         onError={() => setLoadError(true)}
                     />
                }
                { loadError &&
                    <p
                        className={styles.dataMissing}
                        style={{ width, height }}
                    >
                        data missing
                    </p> }
            </div>
            <div className={styles.ghostCursor} ref={cursorRef}>
                {ICONS.cursor}
            </div>
        </div>
    )
})

const ICONS = {
    cursor: <BiCross style={{ fontSize: '16px' }} />
}

export default MineralChannels

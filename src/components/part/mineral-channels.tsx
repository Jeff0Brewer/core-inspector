import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, ReactElement, MutableRefObject, RefObject } from 'react'
import { BiCross } from 'react-icons/bi'
import { useCoreMetadata } from '../../hooks/core-metadata-context'
import { useBlendState } from '../../hooks/blend-context'
import { StringMap, getImageData, getCssColor } from '../../lib/util'
import { getRgbPath, getHydrationPath } from '../../lib/path'
import { isToggleable, getBlendColor } from '../../vis/mineral-blend'
import PartRenderer from '../../vis/part'
import HoverInfo from '../../components/part/hover-info'
import ViewControls from '../../components/part/view-controls'
import CanvasRenderer from '../../components/generic/canvas-renderer'
import LoadIcon from '../../components/generic/load-icon'
import AbundanceWorker from '../../workers/abundances?worker'
import SpectraWorker from '../../workers/spectra?worker'
import { ScrollDepth } from '../../components/part/core-panel'
import { SpectraPanelProps } from '../../components/part/spectra-panel'
import styles from '../../styles/part/mineral-channels.module.css'

const VISUAL_LABEL = 'false color'
const HYDRATION_LABEL = 'hydration'
const BLEND_LABEL = 'blended'
const EXTRA_CHANNELS = [VISUAL_LABEL, HYDRATION_LABEL, BLEND_LABEL]

const MIN_WIDTH_PX = 50

type MineralChannelsProps = {
    vis: PartRenderer | null,
    core: string,
    part: string,
    minerals: Array<string>,
    mineralMaps: StringMap<HTMLImageElement | null>,
    setSelectedSpectrum: (s: SpectraPanelProps) => void,
    scrollDepthRef: MutableRefObject<ScrollDepth>,
    zoomSliderRef: RefObject<HTMLInputElement>
}

const MineralChannels = React.memo(({
    vis, core, part, minerals, mineralMaps,
    setSelectedSpectrum, scrollDepthRef, zoomSliderRef
}: MineralChannelsProps): ReactElement => {
    const [loading, setLoading] = useState<boolean>(true)
    const [zoom, setZoom] = useState<number>(0.25)
    const [spacing, setSpacing] = useState<number>(0.25)
    const [imgDims, setImgDims] = useState<[number, number]>([320, 3000])
    const [viewDims, setViewDims] = useState<[number, number]>([0, 0])
    const [viewGap, setViewGap] = useState<number>(0)

    useEffect(() => {
        setLoading(true)
    }, [part])

    useEffect(() => {
        const imgs = Object.values(mineralMaps)
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
    }, [mineralMaps])

    useLayoutEffect(() => {
        const [imgWidth, imgHeight] = imgDims

        const viewWidth = zoom * (imgWidth - MIN_WIDTH_PX) + MIN_WIDTH_PX
        const viewHeight = viewWidth * imgHeight / imgWidth
        const viewGap = viewWidth * spacing

        setViewDims([viewWidth, viewHeight])
        setViewGap(viewGap)
    }, [mineralMaps, zoom, spacing, imgDims])

    const width = `${viewDims[0]}px`
    const gap = `${viewGap}px`
    return <>
        <ViewControls
            zoom={zoom}
            spacing={spacing}
            setZoom={setZoom}
            setSpacing={setSpacing}
            channelWidth={viewDims[0]}
            zoomSliderRef={zoomSliderRef}
        />
        <div className={styles.content} data-loading={loading}>
            <LoadIcon loading={loading} showDelayMs={100} />
            <ChannelTopLabels
                extraChannels={EXTRA_CHANNELS}
                mineralChannels={minerals}
                width={width}
                gap={gap}
            />
            <ChannelsView
                core={core}
                part={part}
                vis={vis}
                extraChannels={EXTRA_CHANNELS}
                mineralChannels={minerals}
                mineralMaps={mineralMaps}
                imgDims={imgDims}
                viewDims={viewDims}
                viewGap={viewGap}
                setSelectedSpectrum={setSelectedSpectrum}
                scrollDepthRef={scrollDepthRef}
            />
            <ChannelBottomLabels
                extraChannels={EXTRA_CHANNELS}
                mineralChannels={minerals}
                width={width}
                gap={gap}
            />
        </div>
    </>
})

type ChannelLabelsProps = {
    extraChannels: Array<string>,
    mineralChannels: Array<string>,
    width: string,
    gap: string
}

const ChannelTopLabels = React.memo(({
    extraChannels, mineralChannels, width, gap
}: ChannelLabelsProps): ReactElement => {
    return (
        <div className={styles.topLabels} style={{ gap }}>
            { extraChannels.map((label, i) =>
                <p className={styles.topLabel} style={{ width }} key={i}>
                    [{label}]
                </p>
            ) }
            { mineralChannels.map((mineral, i) =>
                <p className={styles.topLabel} style={{ width }} key={i}>
                    {mineral}
                </p>
            ) }
        </div>
    )
})

const ChannelBottomLabels = React.memo(({
    extraChannels, mineralChannels, width, gap
}: ChannelLabelsProps): ReactElement => {
    const { setVisibilities, visibilities, palette, monochrome } = useBlendState()

    const toggleVisible = (mineral: string): void => {
        visibilities[mineral] = !visibilities[mineral]
        setVisibilities({ ...visibilities })
    }

    return (
        <div className={styles.bottomLabels} style={{ gap }}>
            { extraChannels.map((label, i) =>
                <div className={styles.bottomLabel} style={{ width }} key={i}>
                    <button className={styles.toggleButton}>
                        {label}
                    </button>
                </div>
            ) }
            { mineralChannels.map((mineral, i) => {
                const blendColor = getCssColor(getBlendColor(palette, visibilities, monochrome, mineral))
                const toggleable = isToggleable(mineral, palette, visibilities)
                return (
                    <div className={styles.bottomLabel} style={{ width }} key={i}>
                        <div className={styles.blendColor} style={{ backgroundColor: blendColor }}></div>
                        <button
                            className={`${styles.blendButton} ${!toggleable && styles.disabled}`}
                            onClick={() => toggleVisible(mineral)}
                        >
                            {mineral}
                        </button>
                    </div>
                )
            }) }
        </div>
    )
})

type ChannelsViewProps = {
    core: string,
    part: string,
    vis: PartRenderer | null,
    extraChannels: Array<string>,
    mineralChannels: Array<string>,
    mineralMaps: StringMap<HTMLImageElement | null>,
    imgDims: [number, number],
    viewDims: [number, number],
    viewGap: number,
    setSelectedSpectrum: (s: SpectraPanelProps) => void,
    scrollDepthRef: MutableRefObject<ScrollDepth>
}

const ChannelsView = React.memo(({
    core, part, vis, extraChannels, mineralChannels, mineralMaps, imgDims, viewDims, viewGap,
    setSelectedSpectrum, scrollDepthRef
}: ChannelsViewProps): ReactElement => {
    const [sources, setSources] = useState<StringMap<string | HTMLCanvasElement>>({})
    const [abundanceWorker, setAbundanceWorker] = useState<Worker | null>(null)
    const [spectraWorker, setSpectraWorker] = useState<Worker | null>(null)
    const [hoverInfoVisible, setHoverInfoVisible] = useState<boolean>(false)
    const channelsRef = useRef<HTMLDivElement>(null)
    const mousePosRef = useRef<[number, number] | null>(null)
    const { depths } = useCoreMetadata()

    // get channel sources
    useEffect(() => {
        const sources: StringMap<string | HTMLCanvasElement> = {}
        for (const label of extraChannels) {
            switch (label) {
                case BLEND_LABEL:
                    sources[BLEND_LABEL] = vis?.partMinerals ? vis.canvas : 'none'
                    break
                case VISUAL_LABEL:
                    sources[VISUAL_LABEL] = getRgbPath(core, part)
                    break
                case HYDRATION_LABEL:
                    sources[HYDRATION_LABEL] = getHydrationPath(core, part)
            }
        }
        for (const mineral of mineralChannels) {
            sources[mineral] = mineralMaps?.[mineral]?.src || 'none'
        }

        setSources(sources)
    }, [core, part, vis, mineralMaps, extraChannels, mineralChannels])

    // update top / bottom depth for core panel final window on scroll
    // or changes to channel view dimensions
    useEffect(() => {
        const channelsWrap = channelsRef.current
        if (!depths?.[part] || !channelsWrap || !Object.keys(mineralMaps).length) { return }

        const scroll = (): void => {
            const { scrollTop, clientHeight } = channelsWrap
            const topPercent = scrollTop / viewDims[1]
            const bottomPercent = (scrollTop + clientHeight) / viewDims[1]

            const { topDepth, length } = depths[part]
            scrollDepthRef.current = {
                topDepth: Math.max(topDepth, topPercent * length + topDepth),
                bottomDepth: Math.min(topDepth + length, bottomPercent * length + topDepth)
            }
        }
        scroll()

        channelsWrap.addEventListener('scroll', scroll)
        return () => {
            channelsWrap.removeEventListener('scroll', scroll)
        }
    }, [part, depths, viewDims, mineralMaps, scrollDepthRef])

    // init workers for abundance / spectrum hover info
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

    // send image data from mineral channels to abundance worker
    useEffect(() => {
        const imgData: StringMap<ImageData | null> = {}
        for (const [mineral, img] of Object.entries(mineralMaps)) {
            imgData[mineral] = getImageData(img)
        }

        abundanceWorker?.postMessage({
            type: 'init',
            imgData,
            imgWidth: imgDims[0]
        })
    }, [abundanceWorker, mineralMaps, imgDims])

    // send info to spectra worker for constructing file paths
    useEffect(() => {
        spectraWorker?.postMessage({
            type: 'init',
            core,
            part,
            imgHeight: imgDims[1]
        })
    }, [spectraWorker, imgDims, core, part])

    // update hover info on mouse move
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
                { Object.entries(sources).map(([label, source], i) =>
                    <MineralChannel
                        source={source}
                        width={width}
                        height={height}
                        mousePosRef={mousePosRef}
                        onClick={selectSpectrum}
                        customClass={label === HYDRATION_LABEL ? styles.blueColorized : ''}
                        key={i}
                    />
                ) }
                <HoverInfo
                    visible={hoverInfoVisible}
                    abundanceWorker={abundanceWorker}
                    spectrumWorker={spectraWorker}
                    setSelectedSpectrum={setSelectedSpectrum}
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
    onClick: () => void,
    customClass?: string
}

const MineralChannel = React.memo((
    { source, width, height, mousePosRef, onClick, customClass }: MineralChannelProps
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
            mousePosRef.current = [e.clientX - left, e.clientY - top]
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
            <div ref={channelRef} className={customClass}>
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
                     /> }
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

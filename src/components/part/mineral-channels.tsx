import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, ReactElement, MutableRefObject, RefObject } from 'react'
import { BiCross } from 'react-icons/bi'
import { useCoreMetadata } from '../../hooks/core-metadata-context'
import { useBlendState } from '../../hooks/blend-context'
import { loadImageAsync } from '../../lib/load'
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
import { SpectrumInfo } from '../../components/part/spectra-panel'
import styles from '../../styles/part/mineral-channels.module.css'

const VISUAL_LABEL = 'false color'
const HYDRATION_LABEL = 'hydration'
const BLEND_LABEL = 'blended'
const EXTRA_CHANNELS = [VISUAL_LABEL, HYDRATION_LABEL, BLEND_LABEL]

const MIN_WIDTH_PX = 50

type ChannelLabelsProps = {
    extraChannels: Array<string>,
    mineralChannels: Array<string>,
    width: string,
    gap: string
}

type MineralChannelsProps = {
    vis: PartRenderer | null,
    core: string,
    part: string,
    minerals: Array<string>,
    mineralMaps: StringMap<HTMLImageElement | null>,
    setSelectedSpectrum: (s: SpectrumInfo) => void,
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

    const labelProps: ChannelLabelsProps = {
        extraChannels: EXTRA_CHANNELS,
        mineralChannels: minerals,
        width: `${viewDims[0]}px`,
        gap: `${viewGap}px`
    }

    return <>
        <ViewControls
            zoom={zoom}
            spacing={spacing}
            setZoom={setZoom}
            setSpacing={setSpacing}
            channelWidth={viewDims[0]}
            zoomSliderRef={zoomSliderRef}
        />
        <div className={styles.content}>
            <LoadIcon loading={loading} showDelayMs={100} />
            <ChannelTopLabels {...labelProps} />
            <ChannelsView
                loading={loading}
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
            <ChannelBottomLabels {...labelProps } />
        </div>
    </>
})

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
    loading: boolean,
    core: string,
    part: string,
    vis: PartRenderer | null,
    extraChannels: Array<string>,
    mineralChannels: Array<string>,
    mineralMaps: StringMap<HTMLImageElement | null>,
    imgDims: [number, number],
    viewDims: [number, number],
    viewGap: number,
    setSelectedSpectrum: (s: SpectrumInfo) => void,
    scrollDepthRef: MutableRefObject<ScrollDepth>
}

const ChannelsView = React.memo(({
    loading, core, part, vis, extraChannels, mineralChannels, mineralMaps, imgDims, viewDims, viewGap,
    setSelectedSpectrum, scrollDepthRef
}: ChannelsViewProps): ReactElement => {
    const [sources, setSources] = useState<StringMap<string | HTMLCanvasElement>>({})
    const [hoverInfoVisible, setHoverInfoVisible] = useState<boolean>(false)

    const [spectraWorker, setSpectraWorker] = useState<Worker | null>(null)
    const [abundanceWorker, setAbundanceWorker] = useState<Worker | null>(null)
    const abundancesSentRef = useRef<boolean>(false)

    const channelsRef = useRef<HTMLDivElement>(null)
    const mousePosRef = useRef<[number, number] | null>(null)
    const { depths } = useCoreMetadata()

    useEffect(() => {
        const sources: StringMap<string | HTMLCanvasElement> = {}
        abundancesSentRef.current = false

        extraChannels.forEach(label => {
            switch (label) {
                case VISUAL_LABEL:
                    sources[label] = getRgbPath(core, part)
                    break
                case HYDRATION_LABEL:
                    sources[label] = getHydrationPath(core, part)
                    break
                case BLEND_LABEL:
                    sources[label] = vis?.partMinerals ? vis.canvas : 'none'
            }
        })

        mineralChannels.forEach(mineral => {
            sources[mineral] = mineralMaps?.[mineral]?.src || 'none'
        })

        setSources(sources)
    }, [core, part, vis, mineralMaps, extraChannels, mineralChannels])

    // Calculate currently visible top / bottom depth of part for
    // positioning core panel's final selection window.
    useEffect(() => {
        const channelsWrap = channelsRef.current
        if (!channelsWrap || !depths?.[part]) { return }

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
        // Send info required by spectra worker to construct file paths on hover.
        spectraWorker?.postMessage({
            type: 'init',
            core,
            part,
            imgHeight: imgDims[1]
        })
    }, [spectraWorker, imgDims, core, part])

    useEffect(() => {
        if (!abundanceWorker || !Object.keys(mineralMaps).length) { return }

        const initAbundanceData = async (): Promise<void> => {
            // Ensure abundance data is only read once on part change.
            if (abundancesSentRef.current) { return }

            const hydrationPath = getHydrationPath(core, part)
            const hydrationImgPromise = loadImageAsync(hydrationPath)

            // Read image data from mineral channels on part change.
            const imgData: StringMap<ImageData | null> = {}
            for (const [mineral, img] of Object.entries(mineralMaps)) {
                imgData[mineral] = getImageData(img)
            }

            imgData.hydration = getImageData(await hydrationImgPromise)

            // Send image data to worker to read on hover, preventing canvas
            // reads on the main thread.
            abundanceWorker.postMessage({
                type: 'init',
                imgData,
                imgWidth: imgDims[0]
            })

            abundancesSentRef.current = true
        }

        // Read / send image data only on mouse enter into channels to prevent expensive
        // read operations when navigating between parts without hovering channels.
        const channelsWrap = channelsRef.current
        channelsWrap?.addEventListener('mouseover', initAbundanceData)
        return () => {
            channelsWrap?.removeEventListener('mouseover', initAbundanceData)
        }
    }, [core, part, abundanceWorker, imgDims, mineralMaps])

    useEffect(() => {
        const updateHoverInfo = (): void => {
            if (!mousePosRef.current) {
                setHoverInfoVisible(false)
                return
            }

            setHoverInfoVisible(true)

            const mousePosMessage = {
                type: 'mousePosition',
                x: mousePosRef.current[0] / viewDims[0] * imgDims[0],
                y: mousePosRef.current[1] / viewDims[1] * imgDims[1]
            }

            abundanceWorker?.postMessage(mousePosMessage)
            spectraWorker?.postMessage(mousePosMessage)
        }

        const hideHoverInfo = (): void => {
            setHoverInfoVisible(false)
        }

        const channelsWrap = channelsRef.current
        channelsWrap?.addEventListener('mouseleave', hideHoverInfo)
        channelsWrap?.addEventListener('wheel', hideHoverInfo)
        window.addEventListener('mousemove', updateHoverInfo)

        return () => {
            channelsWrap?.removeEventListener('mouseleave', hideHoverInfo)
            channelsWrap?.removeEventListener('wheel', hideHoverInfo)
            window.removeEventListener('mousemove', updateHoverInfo)
        }
    }, [abundanceWorker, spectraWorker, viewDims, imgDims])

    const selectSpectrum = useCallback(() => {
        // Only need to send message type since worker already contains
        // info required to open selected spectrum in panel.
        spectraWorker?.postMessage({
            type: 'mouseClick'
        })
    }, [spectraWorker])

    return (
        <div ref={channelsRef} className={styles.channelsWrap}>
            <div
                className={`${styles.channels} ${loading && styles.channelsHidden}`}
                style={{ gap: `${viewGap}px` }}
                key={'channels'}
            >
                { Object.entries(sources).map(([label, source]) =>
                    <MineralChannel
                        source={source}
                        width={`${viewDims[0]}px`}
                        height={`${viewDims[1]}px`}
                        mousePosRef={mousePosRef}
                        onClick={selectSpectrum}
                        customClass={label === HYDRATION_LABEL ? styles.blueColorized : ''}
                        key={label}
                    />
                ) }
                <HoverInfo
                    visible={hoverInfoVisible}
                    mineralChannels={mineralChannels}
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

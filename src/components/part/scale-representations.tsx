import React, { useState, useEffect, useLayoutEffect, useRef, ReactElement, MemoExoticComponent } from 'react'
import { useCoreMetadata } from '../../hooks/core-metadata-context'
import { useBlendState } from '../../hooks/blend-context'
import { get2dContext, StringMap } from '../../lib/util'
import PartRenderer, { CanvasCtx } from '../../vis/part'
import CanvasRenderer from '../../components/generic/canvas-renderer'
import styles from '../../styles/part/scale-representations.module.css'

type ScaleRepresentationProps = {
    vis: PartRenderer | null,
    part: string,
    parts: Array<string>,
    mToPx: number,
    widthM: number,
    setCenter: (c: number) => void,
    setPart: (p: string | null) => void,
    setHoveredPart: (p: string | null) => void,
    gap: number
}

type ScaleRepresentation = {
    element: MemoExoticComponent<(p: ScaleRepresentationProps) => ReactElement>,
    fullScale?: boolean,
    largeWidth?: boolean
}

const LineRepresentation = React.memo((
    { part, setCenter, setPart, setHoveredPart }: ScaleRepresentationProps
): ReactElement => {
    const lineRef = useRef<HTMLDivElement>(null)
    const { partIds, topDepth, bottomDepth, depths } = useCoreMetadata()

    useEffect(() => {
        if (topDepth === null || bottomDepth == null || !depths?.[part]) {
            return
        }
        const center = depths[part].topDepth + 0.5 * depths[part].length
        const centerPercent = center / (bottomDepth - topDepth)
        setCenter(centerPercent)
    }, [part, setCenter, depths, topDepth, bottomDepth])

    useEffect(() => {
        const line = lineRef.current
        if (!line) { return }

        const getHoveredPart = (e: MouseEvent): string | null => {
            // TODO: cleanup
            const metadataLoaded = topDepth !== null && bottomDepth !== null && partIds !== null && depths !== null
            if (!lineRef.current || !metadataLoaded) { return null }

            const { height, top } = lineRef.current.getBoundingClientRect()

            const hoverPercentage = (e.clientY - top) / height
            const hoverDepth = hoverPercentage * (bottomDepth - topDepth) + topDepth

            let left = 0
            let right = partIds.length - 1
            while (left < right) {
                const center = Math.round((left + right) * 0.5)
                if (!depths[partIds[center]]) { return null }
                const { topDepth, length } = depths[partIds[center]]
                const centerDepth = topDepth + 0.5 * length

                if (hoverDepth === centerDepth) {
                    return partIds[center]
                } else if (hoverDepth < centerDepth) {
                    right = center - 1
                } else {
                    left = center
                }
            }

            return partIds[right]
        }

        const mousemove = (e: MouseEvent): void => {
            const hovered = getHoveredPart(e)
            setHoveredPart(hovered)
        }

        const mousedown = (e: MouseEvent): void => {
            const clicked = getHoveredPart(e)
            setPart(clicked)
        }

        line.addEventListener('mousemove', mousemove)
        line.addEventListener('mousedown', mousedown)

        return () => {
            line.removeEventListener('mousemove', mousemove)
            line.removeEventListener('mousedown', mousedown)
        }
    }, [topDepth, bottomDepth, partIds, depths, setHoveredPart, setPart])

    return <>
        <div
            ref={lineRef}
            className={styles.line}
            onMouseLeave={() => setHoveredPart(null)}
        ></div>
    </>
})

const RectRepresentation = React.memo((
    { part, parts, mToPx, widthM, gap, setCenter, setPart, setHoveredPart }: ScaleRepresentationProps
): ReactElement => {
    const { partIds, depths } = useCoreMetadata()
    const [paddingTop, setPaddingTop] = useState<number>(0)
    const [paddingBottom, setPaddingBottom] = useState<number>(0)
    const wrapRef = useRef<HTMLDivElement>(null)
    const partRef = useRef<HTMLDivElement>(null)

    useLayoutEffect(() => {
        if (partIds === null || depths === null || !depths?.[part]) { return }

        const firstVisibleInd = partIds.indexOf(parts[0])
        const lastVisibleInd = partIds.indexOf(parts[parts.length - 1])

        let totalHeightPx = 0
        let centerPx = 0
        let firstVisiblePx = 0
        let lastVisiblePx = 0
        partIds.forEach((id, i) => {
            if (!depths?.[id]) { return }
            if (i === firstVisibleInd) {
                firstVisiblePx = totalHeightPx
            }
            if (id === part) {
                centerPx = totalHeightPx + 0.5 * depths[id].length * mToPx
            }
            if (i === lastVisibleInd + 1) {
                lastVisiblePx = totalHeightPx
            }
            totalHeightPx += depths[id].length * mToPx + gap
        })
        if (lastVisibleInd === partIds.length - 1) {
            lastVisiblePx = totalHeightPx
        }
        setCenter(centerPx / totalHeightPx)
        setPaddingTop(firstVisiblePx)
        setPaddingBottom(totalHeightPx - lastVisiblePx)
    }, [part, partIds, parts, depths, mToPx, gap, setCenter])

    return (
        <div
            ref={wrapRef}
            className={styles.parts}
            style={{
                gap: `${gap}px`,
                paddingTop,
                paddingBottom
            }}
        >
            { parts.map(id => {
                const heightM = depths?.[id]?.length || 0
                const refProp = { ref: id === part ? partRef : null }
                return (
                    <div
                        {...refProp}
                        className={styles.rect}
                        onClick={() => setPart(id)}
                        onMouseEnter={() => setHoveredPart(id)}
                        onMouseLeave={() => setHoveredPart(null)}
                        style={{
                            width: `${widthM * mToPx}px`,
                            height: `${heightM * mToPx}px`
                        }}
                        key={id}
                    >
                    </div>
                )
            }) }
        </div>
    )
})

const PunchcardRepresentation = React.memo(({
    vis, part, parts, mToPx, widthM, gap, setCenter, setPart, setHoveredPart
}: ScaleRepresentationProps): ReactElement => {
    const [canvasCtxs, setCanvasCtxs] = useState<StringMap<CanvasCtx>>({})
    const blending = useBlendState()

    useEffect(() => {
        const canvasCtxs: StringMap<CanvasCtx> = {}
        for (const part of parts) {
            canvasCtxs[part] = getCanvasCtx()
        }
        setCanvasCtxs(canvasCtxs)
    }, [parts])

    useEffect(() => {
        if (!vis) { return }
        const canvasWidth = widthM * mToPx * window.devicePixelRatio
        for (const [part, canvasCtx] of Object.entries(canvasCtxs)) {
            vis.getPunchcard(part, canvasCtx, canvasWidth)
        }
    }, [parts, vis, mToPx, widthM, canvasCtxs, blending])

    return (
        <CanvasRepresentation
            part={part}
            parts={parts}
            canvasCtxs={canvasCtxs}
            mToPx={mToPx}
            widthM={widthM}
            gap={gap}
            setCenter={setCenter}
            setPart={setPart}
            setHoveredPart={setHoveredPart}
        />
    )
})

const ChannelPunchcardRepresentation = React.memo(({
    vis, part, parts, mToPx, widthM, gap, setCenter, setPart, setHoveredPart
}: ScaleRepresentationProps): ReactElement => {
    const [canvasCtxs, setCanvasCtxs] = useState<StringMap<CanvasCtx>>({})
    const WIDTH_SCALE = 2

    useEffect(() => {
        const canvasCtxs: StringMap<CanvasCtx> = {}
        for (const part of parts) {
            canvasCtxs[part] = getCanvasCtx()
        }
        setCanvasCtxs(canvasCtxs)
    }, [parts])

    useEffect(() => {
        if (!vis) { return }
        const canvasWidth = widthM * mToPx * window.devicePixelRatio
        for (const [part, canvasCtx] of Object.entries(canvasCtxs)) {
            vis.getChannelPunchcard(part, canvasCtx, canvasWidth, WIDTH_SCALE)
        }
    }, [parts, vis, mToPx, widthM, canvasCtxs])

    return (
        <CanvasRepresentation
            part={part}
            parts={parts}
            canvasCtxs={canvasCtxs}
            mToPx={mToPx}
            widthM={widthM}
            gap={gap}
            setCenter={setCenter}
            setPart={setPart}
            setHoveredPart={setHoveredPart}
            widthScale={WIDTH_SCALE}
            canvasSpacer={
                <div className={styles.channelPunchSpacer}></div>
            }
            customRender={canvas => <>
                <div className={styles.channelTicksTop}></div>
                {canvas}
                <div className={styles.channelTicksBottom}></div>
            </>}
        />
    )
})

type CanvasRepresentationProps = {
    part: string,
    parts: Array<string>,
    canvasCtxs: StringMap<CanvasCtx>,
    mToPx: number,
    widthM: number,
    gap: number,
    setCenter: (c: number) => void,
    setPart: (p: string | null) => void,
    setHoveredPart: (p: string | null) => void,
    widthScale?: number,
    canvasSpacer?: ReactElement,
    customRender?: (canvas: ReactElement) => ReactElement
}

const DEFAULT_CANVAS_SPACER: ReactElement = (
    <div className={styles.canvasSpacer}></div>
)

const DEFAULT_CANVAS_RENDER = (canvas: ReactElement): ReactElement => canvas

const CanvasRepresentation = React.memo(({
    part, parts, canvasCtxs, mToPx, widthM, gap, setCenter, setPart, setHoveredPart,
    widthScale = 1, canvasSpacer = DEFAULT_CANVAS_SPACER, customRender = DEFAULT_CANVAS_RENDER
}: CanvasRepresentationProps): ReactElement => {
    const { partIds, depths } = useCoreMetadata()
    const [paddingTop, setPaddingTop] = useState<number>(0)
    const [paddingBottom, setPaddingBottom] = useState<number>(0)
    const wrapRef = useRef<HTMLDivElement>(null)
    const partRef = useRef<HTMLDivElement>(null)

    useLayoutEffect(() => {
        if (partIds === null || depths === null || !depths?.[part]) { return }

        const firstVisibleInd = partIds.indexOf(parts[0])
        const lastVisibleInd = partIds.indexOf(parts[parts.length - 1])

        let totalHeightPx = 0
        let centerPx = 0
        let firstVisiblePx = 0
        let lastVisiblePx = 0
        partIds.forEach((id, i) => {
            if (!depths?.[id]) { return }
            if (i === firstVisibleInd) {
                firstVisiblePx = totalHeightPx
            }
            if (i === lastVisibleInd + 1) {
                lastVisiblePx = totalHeightPx
            }
            if (id === part) {
                centerPx = totalHeightPx + 0.5 * depths[id].length * mToPx
            }
            totalHeightPx += depths[id].length * mToPx + gap
        })
        if (lastVisibleInd === partIds.length - 1) {
            lastVisiblePx = totalHeightPx
        }
        setCenter(centerPx / totalHeightPx)
        setPaddingTop(firstVisiblePx)
        setPaddingBottom(totalHeightPx - lastVisiblePx)
    }, [part, partIds, parts, depths, mToPx, gap, setCenter])

    return <>
        <div
            ref={wrapRef}
            className={styles.parts}
            style={{
                '--gap-size': `${gap}px`,
                paddingTop,
                paddingBottom
            } as React.CSSProperties}
        >
            { parts.map(id => {
                if (!depths?.[id]) {
                    return <></>
                }

                const heightM = depths[id].length || 0
                const refProp = { ref: id === part ? partRef : null }
                return (
                    <React.Fragment key={id}>
                        <div
                            {...refProp}
                            className={styles.canvas}
                            onClick={() => setPart(id)}
                            onMouseEnter={() => setHoveredPart(id)}
                            onMouseLeave={() => setHoveredPart(null)}
                        >
                            { canvasCtxs[id] && customRender(
                                <CanvasRenderer
                                    canvas={canvasCtxs[id].canvas}
                                    width={`${widthM * mToPx * widthScale}px`}
                                    height={`${heightM * mToPx}px`}
                                />
                            ) }
                            { !canvasCtxs[id] && customRender(
                                <div style={{
                                    width: `${widthM * mToPx * widthScale}px`,
                                    height: `${heightM * mToPx}px`
                                }}></div>
                            ) }
                        </div>
                        {canvasSpacer}
                    </React.Fragment>
                )
            }) }
        </div>
    </>
})

function getCanvasCtx (width: number = 0, height: number = 0): CanvasCtx {
    const canvas = document.createElement('canvas')
    const ctx = get2dContext(canvas)

    canvas.width = width
    canvas.height = height

    return { canvas, ctx }
}

export type { ScaleRepresentation }
export {
    LineRepresentation,
    RectRepresentation,
    PunchcardRepresentation,
    ChannelPunchcardRepresentation
}

import React, { useState, useEffect, useLayoutEffect, useCallback, useRef, ReactElement, MemoExoticComponent, RefObject } from 'react'
import { useCoreMetadata } from '../../hooks/core-metadata-context'
import { useBlendState } from '../../hooks/blend-context'
import { get2dContext, lerp, StringMap } from '../../lib/util'
import { DepthMetadata } from '../../lib/metadata'
import PartRenderer, { CanvasCtx } from '../../vis/part'
import CanvasRenderer from '../../components/generic/canvas-renderer'
import styles from '../../styles/part/scale-representations.module.css'

type ScaleRepresentationProps = {
    vis: PartRenderer | null,
    part: string,
    parts: Array<string>,
    mToPx: number,
    widthM: number,
    topDepth: number,
    bottomDepth: number,
    setCenter: (c: number) => void,
    setCenterWindow: (c: number) => void,
    setPart: (p: string | null) => void,
    setHoveredPart: (p: string | null) => void,
    partRef: RefObject<HTMLDivElement>,
    gap: number
}

type RepresentationElement = MemoExoticComponent<(p: ScaleRepresentationProps) => ReactElement>

const LineRepresentation = React.memo((
    { part, setCenter, setCenterWindow, setPart, setHoveredPart }: ScaleRepresentationProps
): ReactElement => {
    const lineRef = useRef<HTMLDivElement>(null)
    const hoverRef = useRef<HTMLDivElement>(null)
    const { partIds, topDepth, bottomDepth, depths } = useCoreMetadata()

    // Calculate positioning parameters from depth values. Don't need to reference
    // px values since line is representative of actual depths and parts can
    // be assumed to be exactly at their depth percentage in full core.
    useLayoutEffect(() => {
        if (topDepth === null || bottomDepth == null || !depths?.[part]) {
            return
        }

        const center = depths[part].topDepth + 0.5 * depths[part].length
        const centerPercent = center / (bottomDepth - topDepth)

        setCenter(centerPercent)
        setCenterWindow(centerPercent)
    }, [part, setCenter, setCenterWindow, depths, topDepth, bottomDepth])

    const getHoveredPart = useCallback((e: React.MouseEvent): string | null => {
        if (
            !lineRef.current || !hoverRef.current || topDepth === null ||
            bottomDepth === null || partIds === null || depths === null
        ) { return null }

        // Find cursor position as percentage of line height to position hover
        // indicator and meters to search for closest part.
        const { top, height } = lineRef.current.getBoundingClientRect()
        const hoverPercentage = (e.clientY - top) / height
        const hoverDepth = hoverPercentage * (bottomDepth - topDepth) + topDepth

        hoverRef.current.style.top = `${hoverPercentage * 100}%`
        return searchClosestPart(hoverDepth, partIds, depths)
    }, [partIds, topDepth, bottomDepth, depths])

    const mouseleave = (): void => {
        setHoveredPart(null)
    }
    const mousemove = (e: React.MouseEvent): void => {
        const part = getHoveredPart(e)
        setHoveredPart(part)
    }
    const mousedown = (e: React.MouseEvent): void => {
        const part = getHoveredPart(e)
        if (part) {
            setPart(part)
        }
    }

    return (
        <div
            ref={lineRef}
            className={styles.line}
            onMouseLeave={mouseleave}
            onMouseMove={mousemove}
            onMouseDown={mousedown}
        >
            <div ref={hoverRef} className={styles.lineHover}></div>
        </div>
    )
})

const RectRepresentation = React.memo(({
    part, parts, mToPx, widthM, gap, setCenter, setPart, setHoveredPart,
    topDepth, bottomDepth, setCenterWindow, partRef
}: ScaleRepresentationProps): ReactElement => {
    const [paddingTop, setPaddingTop] = useState<number>(0)
    const [paddingBottom, setPaddingBottom] = useState<number>(0)
    const { depths } = useCoreMetadata()
    const wrapRef = useRef<HTMLDivElement>(null)

    usePartRepresentationPositioning(
        part, parts, topDepth, bottomDepth, mToPx, gap,
        setCenter, setCenterWindow, setPaddingTop, setPaddingBottom
    )

    return (
        <div
            ref={wrapRef}
            className={`${styles.parts} ${parts.length > 0 && styles.partsVisible}`}
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

type CanvasRepresentationProps = ScaleRepresentationProps & {
    canvasCtxs: StringMap<CanvasCtx>,
    widthScale?: number,
    canvasSpacer?: ReactElement,
    customRender?: (canvas: ReactElement) => ReactElement
}

const MAX_CANVAS_PER_COLUMN = 75
const DEFAULT_CANVAS_RENDER = (canvas: ReactElement): ReactElement => canvas
const DEFAULT_CANVAS_SPACER: ReactElement = (
    <div className={styles.canvasSpacer}></div>
)

const CanvasRepresentation = React.memo(({
    part, parts, canvasCtxs, mToPx, widthM, gap, setCenter, setPart, setHoveredPart,
    topDepth, bottomDepth, setCenterWindow, partRef,
    widthScale = 1, canvasSpacer = DEFAULT_CANVAS_SPACER, customRender = DEFAULT_CANVAS_RENDER
}: CanvasRepresentationProps): ReactElement => {
    const [paddingTop, setPaddingTop] = useState<number>(0)
    const [paddingBottom, setPaddingBottom] = useState<number>(0)
    const wrapRef = useRef<HTMLDivElement>(null)
    const { depths } = useCoreMetadata()

    usePartRepresentationPositioning(
        part, parts, topDepth, bottomDepth, mToPx, gap,
        setCenter, setCenterWindow, setPaddingTop, setPaddingBottom
    )

    const partsVisible = parts.length > 0 && parts.length < MAX_CANVAS_PER_COLUMN

    return (
        <div
            ref={wrapRef}
            className={`${styles.parts} ${partsVisible && styles.partsVisible}`}
            style={{ '--gap-size': `${gap}px`, paddingTop, paddingBottom } as React.CSSProperties}
        >
            { partsVisible && parts.map((id, i) => {
                if (!depths?.[id]) {
                    return <></>
                }

                const width = `${widthM * mToPx * widthScale}px`
                const height = `${depths[id].length * mToPx}px`

                return (
                    <React.Fragment key={id}>
                        <div
                            ref={ id === part ? partRef : null }
                            className={styles.canvas}
                            onClick={() => setPart(id)}
                            onMouseEnter={() => setHoveredPart(id)}
                            onMouseLeave={() => setHoveredPart(null)}
                        >
                            { customRender(
                                canvasCtxs[id]
                                    ? <CanvasRenderer
                                        canvas={canvasCtxs[id].canvas}
                                        width={width}
                                        height={height}
                                    />
                                    : <div style={{ width, height }}></div>
                            ) }
                        </div>
                        {(i !== parts.length - 1) && canvasSpacer}
                    </React.Fragment>
                )
            }) }
        </div>
    )
})

const PunchcardRepresentation = React.memo(({
    vis, part, parts, mToPx, widthM, gap, setCenter, setPart, setHoveredPart,
    topDepth, bottomDepth, setCenterWindow, partRef
}: ScaleRepresentationProps): ReactElement => {
    const canvasCtxs = usePartCanvasCtxs(parts)
    const blending = useBlendState()

    useEffect(() => {
        if (!vis) { return }
        const canvasWidth = widthM * mToPx * window.devicePixelRatio
        for (const [part, canvasCtx] of Object.entries(canvasCtxs)) {
            vis.getPunchcard(part, canvasCtx, canvasWidth)
        }
    }, [parts, vis, mToPx, widthM, canvasCtxs, blending])

    return (
        <CanvasRepresentation
            vis={vis}
            part={part}
            parts={parts}
            partRef={partRef}
            canvasCtxs={canvasCtxs}
            topDepth={topDepth}
            bottomDepth={bottomDepth}
            mToPx={mToPx}
            widthM={widthM}
            gap={gap}
            setCenter={setCenter}
            setCenterWindow={setCenterWindow}
            setPart={setPart}
            setHoveredPart={setHoveredPart}
        />
    )
})

const ChannelPunchcardRepresentation = React.memo(({
    vis, part, parts, mToPx, widthM, gap, setCenter, setPart, setHoveredPart,
    topDepth, bottomDepth, setCenterWindow, partRef
}: ScaleRepresentationProps): ReactElement => {
    const canvasCtxs = usePartCanvasCtxs(parts)
    const WIDTH_SCALE = 2

    useEffect(() => {
        if (!vis) { return }
        const canvasWidth = widthM * mToPx * window.devicePixelRatio
        for (const [part, canvasCtx] of Object.entries(canvasCtxs)) {
            vis.getChannelPunchcard(part, canvasCtx, canvasWidth, WIDTH_SCALE)
        }
    }, [parts, vis, mToPx, widthM, canvasCtxs])

    return (
        <CanvasRepresentation
            vis={vis}
            part={part}
            parts={parts}
            canvasCtxs={canvasCtxs}
            mToPx={mToPx}
            widthM={widthM}
            topDepth={topDepth}
            bottomDepth={bottomDepth}
            partRef={partRef}
            gap={gap}
            setCenter={setCenter}
            setCenterWindow={setCenterWindow}
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

// Binary search for part with depth closest to search depth.
// Must supply parts list in sorted order.
function searchClosestPart (
    searchDepth: number,
    parts: Array<string>,
    depths: DepthMetadata
): string | null {
    let left = 0
    let right = parts.length - 1
    while (left < right) {
        const center = Math.round((left + right) * 0.5)
        if (!depths[parts[center]]) {
            return null
        }

        const { topDepth, length } = depths[parts[center]]
        const centerDepth = topDepth + 0.5 * length

        if (searchDepth === centerDepth) {
            return parts[center]
        } else if (searchDepth < centerDepth) {
            right = center - 1
        } else {
            left = center
        }
    }

    // return closest part if no exact equality
    return parts[right]
}

// TODO: convert to obj pool of canvases, only init canvases if length of parts increases, assign canvases from pool to part ids on change
function usePartCanvasCtxs (
    parts: Array<string>
): StringMap<CanvasCtx> {
    const [canvasCtxs, setCanvasCtxs] = useState<StringMap<CanvasCtx>>({})

    useEffect(() => {
        if (parts.length > MAX_CANVAS_PER_COLUMN) {
            setCanvasCtxs({})
            return
        }

        const canvasCtxs: StringMap<CanvasCtx> = {}
        for (const part of parts) {
            const canvas = document.createElement('canvas')
            const ctx = get2dContext(canvas)
            canvasCtxs[part] = { canvas, ctx }
        }
        setCanvasCtxs(canvasCtxs)
    }, [parts])

    return canvasCtxs
}

function usePartRepresentationPositioning (
    part: string,
    parts: Array<string>,
    topDepth: number,
    bottomDepth: number,
    mToPx: number,
    gapPx: number,
    setCenter: (c: number) => void,
    setCenterWindow: (c: number) => void,
    setPaddingTop: (p: number) => void,
    setPaddingBottom: (p: number) => void
): void {
    const { partIds, depths } = useCoreMetadata()

    // Calculate pixel positions of parts to get layout values for
    // top / bottom / center of column. Because of transitions, cannot wait for
    // actual DOM to render to get positions so must calculate here.
    useLayoutEffect(() => {
        if (partIds === null || depths === null || !depths?.[part]) {
            return
        }

        const firstVisibleInd = partIds.indexOf(parts[0])
        const lastVisibleInd = partIds.indexOf(parts[parts.length - 1])

        let currHeightM = 0
        let currHeightPx = 0
        let centerPx = 0
        let firstVisiblePx = 0
        let lastVisiblePx = 0
        let topDepthPx: number | null = null
        let bottomDepthPx: number | null = null

        partIds.forEach((id, i) => {
            if (!depths?.[id]) {
                return
            }

            const { topDepth: partTop, length: partLength } = depths[id]
            const lastHeightPx = currHeightPx
            const lastHeightM = currHeightM
            currHeightPx += partLength * mToPx + gapPx
            currHeightM = partTop + partLength

            // Since px gap between parts is not representative of actual depth,
            // parts are not positioned exactly at their percentage depth in the core.
            // Must interpolate between adjacent part values convert m positions to px.
            if (lastHeightM <= topDepth && currHeightM > topDepth) {
                const t = (topDepth - lastHeightM) / (currHeightM - lastHeightM)
                topDepthPx = lerp(lastHeightPx, currHeightPx, t)
            }
            if (lastHeightM < bottomDepth && currHeightM >= bottomDepth) {
                const t = (bottomDepth - lastHeightM) / (currHeightM - lastHeightM)
                bottomDepthPx = lerp(lastHeightPx, currHeightPx, t)
            }

            if (i === firstVisibleInd) {
                firstVisiblePx = lastHeightPx
            }
            if (i === lastVisibleInd + 1) {
                lastVisiblePx = lastHeightPx
            }
            if (id === part) {
                centerPx = lastHeightPx + 0.5 * partLength * mToPx
            }
        })

        // No gap after last part, remove here.
        currHeightPx -= gapPx

        // Ensure last visible position is set if part is last in core.
        if (lastVisibleInd === partIds.length - 1) {
            lastVisiblePx = currHeightPx
        }

        // Top / bottom padding fills space that would be taken by all non-visible parts in core.
        // This prevents part px position from changing when set of visible parts changes and simplifies
        // smooth scrolling transition on part change.
        setPaddingTop(firstVisiblePx)
        setPaddingBottom(currHeightPx - lastVisiblePx)

        // Get center as percentage of total representation height to position representation in column.
        setCenter(centerPx / currHeightPx)

        // Get center as percentage of total column height to position highlight window on top of column.
        if (topDepthPx !== null && bottomDepthPx !== null) {
            const percent = (centerPx - topDepthPx) / (bottomDepthPx - topDepthPx)
            setCenterWindow(percent)
        }
    }, [
        partIds, depths, part, parts, topDepth, bottomDepth, mToPx, gapPx,
        setCenter, setCenterWindow, setPaddingTop, setPaddingBottom
    ])
}

export type { RepresentationElement }
export {
    LineRepresentation,
    RectRepresentation,
    PunchcardRepresentation,
    ChannelPunchcardRepresentation
}

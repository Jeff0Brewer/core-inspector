import React, { useState, useEffect, useRef, ReactElement } from 'react'
import { useCoreMetadata } from '../../hooks/core-metadata-context'
import { useBlendState } from '../../hooks/blend-context'
import { get2dContext, StringMap } from '../../lib/util'
import PartRenderer, { CanvasCtx } from '../../vis/part'
import CanvasRenderer from '../../components/generic/canvas-renderer'
import styles from '../../styles/part/core-representations.module.css'

type ScaleRepresentationProps = {
    vis: PartRenderer | null,
    part: string,
    parts: Array<string>,
    mToPx: number,
    widthM: number,
    setCenter: (c: number) => void,
    setPart: (p: string | null) => void,
    gap: number
}

type ScaleRepresentation = {
    element: (p: ScaleRepresentationProps) => ReactElement,
    fullScale?: boolean,
    largeWidth?: boolean
}

function LineRepresentation (
    { part, setCenter }: ScaleRepresentationProps
): ReactElement {
    const { topDepth, bottomDepth, depths } = useCoreMetadata()

    useEffect(() => {
        const center = depths[part].topDepth + 0.5 * depths[part].length
        const centerPercent = center / (bottomDepth - topDepth)
        setCenter(centerPercent)
    }, [part, depths, topDepth, bottomDepth, setCenter])

    return <>
        <div className={styles.line}></div>
    </>
}

function RectRepresentation (
    { part, parts, mToPx, widthM, gap, setCenter, setPart }: ScaleRepresentationProps
): ReactElement {
    const { depths } = useCoreMetadata()
    const wrapRef = useRef<HTMLDivElement>(null)
    const partRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const partDiv = partRef.current
        const wrapDiv = wrapRef.current
        if (!partDiv || !wrapDiv) { return }

        const partRect = partDiv.getBoundingClientRect()
        const wrapRect = wrapDiv.getBoundingClientRect()

        const partCenter = (partRect.top - wrapRect.top) + 0.5 * partRect.height
        const wrapHeight = wrapRect.height

        setCenter(partCenter / wrapHeight)
    })

    return (
        <div
            ref={wrapRef}
            className={styles.parts}
            style={{ gap: `${gap}px` }}
        >
            { parts.map((id, i) =>
                <div
                    className={styles.rect}
                    ref={id === part ? partRef : null}
                    onClick={() => setPart(id)}
                    style={{
                        width: `${widthM * mToPx}px`,
                        height: `${depths[id].length * mToPx}px`
                    }}
                    key={i}
                >
                </div>
            ) }
        </div>
    )
}

function PunchcardRepresentation (
    { vis, part, parts, mToPx, widthM, gap, setCenter, setPart }: ScaleRepresentationProps
): ReactElement {
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
        />
    )
}

function ChannelPunchcardRepresentation (
    { vis, part, parts, mToPx, widthM, gap, setCenter, setPart }: ScaleRepresentationProps
): ReactElement {
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
}

type CanvasRepresentationProps = {
    part: string,
    parts: Array<string>,
    canvasCtxs: StringMap<CanvasCtx>,
    mToPx: number,
    widthM: number,
    gap: number,
    setCenter: (c: number) => void,
    setPart: (p: string | null) => void,
    widthScale?: number,
    canvasSpacer?: ReactElement,
    customRender?: (canvas: ReactElement) => ReactElement
}

const DEFAULT_CANVAS_SPACER: ReactElement = (
    <div className={styles.canvasSpacer}></div>
)

const DEFAULT_CANVAS_RENDER = (canvas: ReactElement): ReactElement => canvas

function CanvasRepresentation ({
    part, parts, canvasCtxs, mToPx, widthM, gap, setCenter, setPart,
    widthScale = 1, canvasSpacer = DEFAULT_CANVAS_SPACER, customRender = DEFAULT_CANVAS_RENDER
}: CanvasRepresentationProps): ReactElement {
    const { depths } = useCoreMetadata()
    const wrapRef = useRef<HTMLDivElement>(null)
    const partRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const partDiv = partRef.current
        const wrapDiv = wrapRef.current
        if (!partDiv || !wrapDiv) { return }

        const partRect = partDiv.getBoundingClientRect()
        const wrapRect = wrapDiv.getBoundingClientRect()

        const partCenter = (partRect.top - wrapRect.top) + 0.5 * partRect.height
        const wrapHeight = wrapRect.height

        setCenter(partCenter / wrapHeight)
    })

    return <>
        <div
            ref={wrapRef}
            className={styles.parts}
            style={{ '--gap-size': `${gap}px` } as React.CSSProperties}
        >
            { parts.map((id, i) =>
                <React.Fragment key={i}>
                    <div
                        className={styles.canvas}
                        ref={id === part ? partRef : null}
                        onClick={() => setPart(id)}
                    >
                        { canvasCtxs[id] && customRender(
                            <CanvasRenderer
                                canvas={canvasCtxs[id].canvas}
                                width={`${widthM * mToPx * widthScale}px`}
                                height={`${depths[id].length * mToPx}px`}
                            />
                        ) }
                    </div>
                    {i !== parts.length - 1 && canvasSpacer}
                </React.Fragment>
            ) }
        </div>
    </>
}

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

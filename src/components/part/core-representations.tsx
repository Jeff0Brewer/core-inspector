import { useState, useEffect, useRef, ReactElement } from 'react'
import { useCoreMetadata } from '../../hooks/core-metadata-context'
import { useBlendState } from '../../hooks/blend-context'
import { get2dContext, StringMap } from '../../lib/util'
import PartRenderer, { CanvasCtx } from '../../vis/part'
import CanvasRenderer from '../../components/generic/canvas-renderer'

const PART_WIDTH_M = 0.0525

type CoreRepresentationProps = {
    vis: PartRenderer | null,
    part: string,
    parts: Array<string>,
    mToPx: number,
    setCenter: (c: number) => void,
    setPart: (p: string | null) => void,
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
    { part, parts, mToPx, gap, setCenter, setPart }: CoreRepresentationProps
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
                    onClick={() => setPart(id)}
                    {...refProp}
                    key={i}
                    className={'part-rect'}
                    style={{
                        width: `${PART_WIDTH_M * mToPx}px`,
                        height: `${depths[id].length * mToPx}px`
                    }}
                >
                </div>
            }) }
        </div>
    )
}

function CorePunchcardRepresentation (
    { vis, part, parts, mToPx, gap, setCenter, setPart }: CoreRepresentationProps
): ReactElement {
    const [canvasCtxs, setCanvasCtxs] = useState<StringMap<CanvasCtx>>({})
    const { depths } = useCoreMetadata()
    const blending = useBlendState()
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
        if (!vis) { return }
        for (const part of parts) {
            if (canvasCtxs[part]) {
                vis.getPunchcard(part, canvasCtxs[part], PART_WIDTH_M * mToPx * window.devicePixelRatio)
            }
        }
    }, [parts, vis, mToPx, canvasCtxs, blending])

    return <>
        <div
            ref={wrapRef}
            className={'part-rect-wrap'}
            style={{ gap: `${gap}px` }}
        >
            { parts.map((id, i) => {
                const refProp = id === part ? { ref: partRef } : {}
                return (
                    <div
                        {...refProp}
                        onClick={() => setPart(id)}
                        key={i}
                        className={'part-punchcard'}
                    >
                        { canvasCtxs && canvasCtxs[id] && <CanvasRenderer
                            canvas={canvasCtxs[id].canvas}
                            width={`${PART_WIDTH_M * mToPx}px`}
                            height={`${depths[id].length * mToPx}px`}
                        /> }
                    </div>
                )
            }) }
        </div>
    </>
}

// TODO: fix duplication
function CoreChannelPunchcardRepresentation (
    { vis, part, parts, mToPx, gap, setCenter, setPart }: CoreRepresentationProps
): ReactElement {
    const [canvasCtxs, setCanvasCtxs] = useState<StringMap<CanvasCtx>>({})
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
        if (!vis) { return }
        for (const part of parts) {
            if (canvasCtxs[part]) {
                vis.getChannelPunchcard(part, canvasCtxs[part], PART_WIDTH_M * mToPx * window.devicePixelRatio)
            }
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
                return (
                    <div
                        {...refProp}
                        onClick={() => setPart(id)}
                        key={i}
                        className={'part-punchcard'}
                    >
                        { canvasCtxs && canvasCtxs[id] && <CanvasRenderer
                            canvas={canvasCtxs[id].canvas}
                            width={`${PART_WIDTH_M * mToPx}px`}
                            height={`${depths[id].length * mToPx}px`}
                        /> }
                    </div>
                )
            }) }
        </div>
    )
}

function getCanvasCtx (width: number = 0, height: number = 0): CanvasCtx {
    const canvas = document.createElement('canvas')
    const ctx = get2dContext(canvas)

    canvas.width = width
    canvas.height = height

    return { canvas, ctx }
}

export type { CoreRepresentation }
export {
    CoreLineRepresentation,
    CoreRectRepresentation,
    CorePunchcardRepresentation,
    CoreChannelPunchcardRepresentation
}

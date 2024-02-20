import { useState, useEffect, useRef, ReactElement } from 'react'
import { useCoreMetadata } from '../../hooks/core-metadata-context'
import { useBlendState } from '../../hooks/blend-context'
import { clamp, get2dContext, StringMap } from '../../lib/util'
import PartRenderer, { CanvasCtx } from '../../vis/part'
import CanvasRenderer from '../../components/generic/canvas-renderer'

import '../../styles/single-part.css'
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
                        height: `${depths[id].length * mToPx}px`,
                        backgroundColor: '#fff'
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
    }, [parts, vis, mToPx, canvasCtxs])

    const blendTimeoutRef = useRef<number>(-1)
    useEffect(() => {
        if (!vis || !canvasCtxs) { return }
        window.clearTimeout(blendTimeoutRef.current)
        blendTimeoutRef.current = window.setTimeout(() => {
            for (const part of parts) {
                if (canvasCtxs[part]) {
                    vis.getPunchcard(part, canvasCtxs[part], PART_WIDTH_M * mToPx * window.devicePixelRatio)
                }
            }
        }, 10)

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [blending])

    return (
        <div
            ref={wrapRef}
            className={'part-rect-wrap'}
            style={{ gap: `${gap}px` }}
        >
            { parts.map((id, i) => {
                const refProp = id === part ? { ref: partRef } : {}
                return <div
                    {...refProp}
                    onClick={() => setPart(id)}
                    key={i}
                    className={'part-rect'}
                >
                    { canvasCtxs && canvasCtxs[id] && <CanvasRenderer
                        canvas={canvasCtxs[id].canvas}
                        width={`${PART_WIDTH_M * mToPx}px`}
                        height={`${depths[id].length * mToPx}px`}
                    /> }
                </div>
            }) }
        </div>
    )
}

type CoreScaleColumnProps = {
    vis: PartRenderer | null,
    part: string,
    parts: Array<string>,
    topDepth: number,
    bottomDepth: number,
    representations: Array<CoreRepresentation>,
    setPart: (p: string | null) => void,
    gap?: number
}

function CoreScaleColumn (
    { vis, part, parts, topDepth, bottomDepth, representations, setPart, gap = 1 }: CoreScaleColumnProps
): ReactElement {
    const { depths } = useCoreMetadata()
    const [visibleParts, setVisibleParts] = useState<Array<string>>([])
    const [mToPx, setMToPx] = useState<number>(0)
    const [windowCenter, setWindowCenter] = useState<number>(0)
    const [nextTopDepth, setNextTopDepth] = useState<number>(0)
    const [nextBottomDepth, setNextBottomDepth] = useState<number>(0)
    const columnRef = useRef<HTMLDivElement>(null)

    // get m / px scale of column
    useEffect(() => {
        const getScale = (): void => {
            const column = columnRef.current
            if (!column) { return }

            const heightM = bottomDepth - topDepth
            const heightPx = column.getBoundingClientRect().height
            setMToPx(heightPx / heightM)
        }

        getScale()

        window.addEventListener('resize', getScale)
        return () => {
            window.removeEventListener('resize', getScale)
        }
    }, [topDepth, bottomDepth])

    // get visible parts within depth range
    useEffect(() => {
        const visibleParts: Array<string> = []

        parts.forEach(part => {
            if (!depths[part]) { return }

            const partTopDepth = depths[part].topDepth
            const partBottomDepth = partTopDepth + depths[part].length
            if (partBottomDepth > topDepth && partTopDepth < bottomDepth) {
                visibleParts.push(part)
            }
        })

        setVisibleParts(visibleParts)
    }, [parts, depths, topDepth, bottomDepth])

    // get next column's depth range
    useEffect(() => {
        const depthRange = bottomDepth - topDepth
        const nextDepthRange = Math.sqrt(depthRange)

        const center = clamp(
            depths[part].topDepth + 0.5 * depths[part].length,
            topDepth + nextDepthRange * 0.5,
            bottomDepth - nextDepthRange * 0.5

        )
        setNextTopDepth(center - 0.5 * nextDepthRange)
        setNextBottomDepth(center + 0.5 * nextDepthRange)
    }, [part, depths, topDepth, bottomDepth])

    const Representation = representations[0]
    return <>
        <div className={'scale-column'} ref={columnRef}>
            <div
                className={'representation-wrap'}
                style={{
                    top: '50%',
                    transform: `translateY(${-windowCenter * 100}%)`
                }}
            >
                <div
                    className={'next-window'}
                    style={{
                        top: `${windowCenter * 100}%`,
                        height: `${(nextBottomDepth - nextTopDepth) * mToPx}px`
                    }}
                ></div>
                <Representation
                    vis={vis}
                    part={part}
                    parts={visibleParts}
                    mToPx={mToPx}
                    setCenter={setWindowCenter}
                    setPart={setPart}
                    gap={gap}
                />
            </div>
        </div>
        { representations.length > 1 &&
            <CoreScaleColumn
                vis={vis}
                part={part}
                parts={visibleParts}
                topDepth={nextTopDepth}
                bottomDepth={nextBottomDepth}
                representations={representations.slice(1)}
                setPart={setPart}
                gap={gap * 2}
            />
        }
    </>
}

type CorePanelProps = {
    vis: PartRenderer | null,
    part: string,
    parts: Array<string>,
    representations: Array<CoreRepresentation>,
    setPart: (p: string | null) => void
}

function CorePanel (
    { vis, part, parts, representations, setPart }: CorePanelProps
): ReactElement {
    const { topDepth, bottomDepth } = useCoreMetadata()

    return (
        <div className={'core-panel'}>
            <CoreScaleColumn
                vis={vis}
                part={part}
                parts={parts}
                topDepth={topDepth}
                bottomDepth={bottomDepth}
                representations={representations}
                setPart={setPart}
            />
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

export default CorePanel
export {
    CoreLineRepresentation,
    CoreRectRepresentation,
    CorePunchcardRepresentation
}

import React, { useState, useEffect, useRef, ReactElement } from 'react'
import { useCoreMetadata } from '../../hooks/core-metadata-context'
import { clamp, roundTo } from '../../lib/util'
import PartRenderer from '../../vis/part'
import { CoreRepresentation } from '../../components/part/core-representations'

type ScaleColumnLabelProps = {
    topDepth: number,
    bottomDepth: number,
    largeWidth: boolean
}

function formatDepthRange (topDepth: number, bottomDepth: number): string {
    const topStr = roundTo(Math.max(topDepth, 0), 1).toString()
    const bottomStr = roundTo(bottomDepth, 1).toString()
    return `${topStr} - ${bottomStr}m`
}

function ScaleColumnLabel (
    { topDepth, bottomDepth, largeWidth }: ScaleColumnLabelProps
): ReactElement {
    return (
        <div className={'scale-column-label'} data-large={largeWidth}>
            <p>{formatDepthRange(topDepth, bottomDepth)}</p>
        </div>
    )
}

type ScaleColumnProps = {
    vis: PartRenderer | null,
    part: string,
    representation: CoreRepresentation,
    parts: Array<string>,
    topDepth: number,
    bottomDepth: number,
    nextTopDepth: number,
    nextBottomDepth: number,
    gap: number,
    setPart: (p: string | null) => void
}

function ScaleColumn ({
    vis, part, representation, parts, topDepth, bottomDepth,
    nextTopDepth, nextBottomDepth, gap, setPart
}: ScaleColumnProps): ReactElement {
    const [mToPx, setMToPx] = useState<number>(0)
    const [partCenter, setPartCenter] = useState<number>(0)
    const columnRef = useRef<HTMLDivElement>(null)
    const {
        element: RepresentationElement,
        fullScale,
        largeWidth
    } = representation

    // get meter to pixel scale of column
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

    const representationStyle: React.CSSProperties = {}
    if (!fullScale) {
        // center selected part if not viewing full core depth range
        representationStyle.transform = `translateY(-${partCenter * 100}%)`
        representationStyle.top = '50%'
    }

    const windowTop = (nextTopDepth - topDepth) / (bottomDepth - topDepth)
    const windowBottom = (nextBottomDepth - topDepth) / (bottomDepth - topDepth)

    return <>
        <div ref={columnRef} className={'scale-column'} data-large={largeWidth}>
            <div
                className={'next-window'}
                style={{
                    top: `${windowTop * 100}%`,
                    bottom: `${(1 - windowBottom) * 100}%`
                }}
            ></div>
            <div
                className={'representation-wrap'}
                style={fullScale
                    ? {}
                    : {
                        transform: `translateY(-${partCenter * 100}%)`,
                        top: '50%'
                    }}
            >
                <RepresentationElement
                    vis={vis}
                    part={part}
                    parts={parts}
                    mToPx={mToPx}
                    setCenter={setPartCenter}
                    setPart={setPart}
                    gap={gap}
                />
            </div>
        </div>
        <div className={'zoom-lines'}>
            {getZoomSvg(windowTop, windowBottom)}
        </div>
    </>
}

type CorePanelProps = {
    vis: PartRenderer | null,
    part: string,
    parts: Array<string>,
    representations: Array<CoreRepresentation>,
    setPart: (p: string | null) => void,
    finalTopDepth?: number,
    finalBottomDepth?: number
}

function CorePanel ({
    vis, part, parts, representations, setPart,
    finalTopDepth = 0, finalBottomDepth = 0
}: CorePanelProps): ReactElement {
    const { depths, topDepth: minDepth, bottomDepth: maxDepth } = useCoreMetadata()
    const [topDepths, setTopDepths] = useState<Array<number>>([])
    const [bottomDepths, setBottomDepths] = useState<Array<number>>([])
    const [gaps, setGaps] = useState<Array<number>>([])
    const [visibleParts, setVisibleParts] = useState<Array<Array<string>>>([])

    useEffect(() => {
        const topDepths = [minDepth]
        const bottomDepths = [maxDepth]
        const visibleParts = [parts]
        const gaps = [1]

        const partCenter = depths[part].topDepth + depths[part].length * 0.5
        for (let i = 1; i < representations.length; i++) {
            const lastDepthRange = bottomDepths[i - 1] - topDepths[i - 1]
            const depthRange = Math.pow(lastDepthRange, 0.45)
            const depthCenter = clamp(
                partCenter,
                topDepths[i - 1] + depthRange * 0.5,
                bottomDepths[i - 1] - depthRange * 0.5
            )
            const topDepth = depthCenter - depthRange * 0.5
            const bottomDepth = depthCenter + depthRange * 0.5
            topDepths.push(topDepth)
            bottomDepths.push(bottomDepth)
            visibleParts.push(
                parts.filter(part => {
                    if (!depths[part]) { return false }

                    const partTopDepth = depths[part].topDepth
                    const partBottomDepth = partTopDepth + depths[part].length

                    return (partBottomDepth > topDepth && partTopDepth < bottomDepth)
                })
            )
            gaps.push(gaps[i - 1] * 3)
        }

        setTopDepths(topDepths)
        setBottomDepths(bottomDepths)
        setVisibleParts(visibleParts)
        setGaps(gaps)
    }, [part, parts, representations, depths, minDepth, maxDepth])

    return <>
        <div className={'scale-column-labels'}>
            { representations.map((representation, i) =>
                <ScaleColumnLabel
                    topDepth={topDepths[i] || 0}
                    bottomDepth={bottomDepths[i] || 0}
                    largeWidth={!!representation.largeWidth}
                    key={i}
                />
            ) }
        </div>
        <div className={'core-panel'}>
            { representations.map((representation, i) =>
                <ScaleColumn
                    vis={vis}
                    part={part}
                    representation={representation}
                    parts={visibleParts[i] || []}
                    topDepth={topDepths[i] || 0}
                    bottomDepth={bottomDepths[i] || 0}
                    nextTopDepth={topDepths[i + 1] || finalTopDepth}
                    nextBottomDepth={bottomDepths[i + 1] || finalBottomDepth}
                    gap={gaps[i]}
                    setPart={setPart}
                    key={i}
                />
            ) }
        </div>
    </>
}

function getZoomSvg (
    windowTop: number,
    windowBottom: number
): ReactElement {
    if (Number.isNaN(windowTop) || Number.isNaN(windowBottom)) {
        return <></>
    }
    return (
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polygon
                fill="#1d1d1e"
                points={`0,${windowTop * 100} 0,${windowBottom * 100} 100,100 100,0`}
            />
        </svg>
    )
}

export default CorePanel

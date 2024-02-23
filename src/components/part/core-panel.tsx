import React, { useState, useEffect, useRef, ReactElement } from 'react'
import { useCoreMetadata } from '../../hooks/core-metadata-context'
import { clamp } from '../../lib/util'
import PartRenderer from '../../vis/part'
import { CoreRepresentation } from '../../components/part/core-representations'

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

    // get visible parts within depth range
    useEffect(() => {
        setVisibleParts(
            parts.filter(part => {
                if (!depths[part]) { return false }

                const partTopDepth = depths[part].topDepth
                const partBottomDepth = partTopDepth + depths[part].length

                return (partBottomDepth > topDepth && partTopDepth < bottomDepth)
            })
        )
    }, [parts, depths, topDepth, bottomDepth])

    // get next column's depth range
    useEffect(() => {
        const depthRange = bottomDepth - topDepth
        const nextDepthRange = Math.pow(depthRange, 0.45)

        const center = clamp(
            depths[part].topDepth + depths[part].length * 0.5,
            topDepth + nextDepthRange * 0.5,
            bottomDepth - nextDepthRange * 0.5

        )
        setNextTopDepth(center - nextDepthRange * 0.5)
        setNextBottomDepth(center + nextDepthRange * 0.5)
    }, [part, depths, topDepth, bottomDepth])

    const {
        element: RepresentationElement,
        fullScale,
        largeWidth
    } = representations[0]
    const hasNext = representations.length > 1

    const representationStyle: React.CSSProperties = {}
    if (!fullScale) {
        // center selected part if not viewing full core depth range
        representationStyle.transform = `translateY(-${windowCenter * 100}%)`
        representationStyle.top = '50%'
    }

    const windowStyle: React.CSSProperties = {
        top: `${windowCenter * 100}%`,
        height: `${(nextBottomDepth - nextTopDepth) * mToPx}px`
    }

    return <>
        <div ref={columnRef} className={'scale-column'} data-large={largeWidth}>
            <div className={'representation-wrap'} style={representationStyle}>
                { hasNext &&
                    <div className={'next-window'} style={windowStyle}></div> }
                <RepresentationElement
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
        { hasNext && <>
            <div className={'zoom-lines'}>
                {getZoomSvg(
                    fullScale ? windowCenter : 0.5,
                    bottomDepth - topDepth,
                    nextBottomDepth - nextTopDepth
                )}
            </div>
            <CoreScaleColumn
                vis={vis}
                part={part}
                parts={visibleParts}
                topDepth={nextTopDepth}
                bottomDepth={nextBottomDepth}
                representations={representations.slice(1)}
                setPart={setPart}
                gap={gap * 3}
            />
        </> }
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

function getZoomSvg (
    windowCenter: number,
    depthRange: number,
    nextDepthRange: number
): ReactElement {
    if (depthRange === 0) { return <></> }

    const windowHeight = nextDepthRange / depthRange
    const topPercent = (windowCenter - windowHeight * 0.5) * 100
    const bottomPercent = (windowCenter + windowHeight * 0.5) * 100

    const points = `0,${topPercent} 0,${bottomPercent} 100,100 100,0`
    return (
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polygon fill="#1d1d1e" points={points} />
        </svg>
    )
}

export default CorePanel

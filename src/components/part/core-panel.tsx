import { useState, useEffect, useRef, ReactElement } from 'react'
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
    fullScale?: boolean,
    gap?: number
}

function CoreScaleColumn (
    { vis, part, parts, topDepth, bottomDepth, representations, setPart, fullScale = false, gap = 1 }: CoreScaleColumnProps
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
        const nextDepthRange = Math.pow(depthRange, 0.4)

        const center = clamp(
            depths[part].topDepth + 0.5 * depths[part].length,
            topDepth + nextDepthRange * 0.5,
            bottomDepth - nextDepthRange * 0.5

        )
        setNextTopDepth(center - 0.5 * nextDepthRange)
        setNextBottomDepth(center + 0.5 * nextDepthRange)
    }, [part, depths, topDepth, bottomDepth])

    const Representation = representations[0]
    const hasNext = representations.length > 1

    return <>
        <div className={'scale-column'} ref={columnRef}>
            <div
                className={'representation-wrap'}
                style={
                    fullScale
                        ? {}
                        : {
                            top: '50%',
                            transform: `translateY(-${windowCenter * 100}%)`
                        }
                }
            >
                { hasNext && <div
                    className={'next-window'}
                    style={{
                        top: `${windowCenter * 100}%`,
                        height: `${(nextBottomDepth - nextTopDepth) * mToPx}px`
                    }}
                ></div> }
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
        { hasNext && <>
            <div className={'zoom-lines'}>
                {getZoomSvg(windowCenter, bottomDepth - topDepth, nextBottomDepth - nextTopDepth)}
            </div>
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
        </> }
    </>
}

type CorePanelProps = {
    vis: PartRenderer | null,
    part: string,
    parts: Array<string>,
    representations: Array<CoreRepresentation>,
    setPart: (p: string | null) => void,
    fullScale?: boolean
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
                fullScale={true}
            />
        </div>
    )
}

function getZoomSvg (
    center: number,
    depthRange: number,
    nextDepthRange: number
): ReactElement {
    if (depthRange === 0) {
        return <></>
    }

    const windowHeight = nextDepthRange / depthRange

    const topPercent = (center - windowHeight * 0.5) * 100
    const bottomPercent = (center + windowHeight * 0.5) * 100
    const points = `0,${topPercent} 0,${bottomPercent} 100,100 100,0`
    return (
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polygon fill="#727280" points={points} />
        </svg>
    )
}

export default CorePanel

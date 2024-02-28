import { useState, useEffect, useRef, ReactElement } from 'react'
import { useCoreMetadata } from '../../hooks/core-metadata-context'
import { clamp, roundTo } from '../../lib/util'
import PartRenderer from '../../vis/part'
import { CoreRepresentation } from '../../components/part/core-representations'

type CoreColumn = {
    representation: CoreRepresentation,
    parts: Array<string>,
    topDepth: number,
    bottomDepth: number,
    gap: number
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
    const [columns, setColumns] = useState<Array<CoreColumn>>([])

    useEffect(() => {
        const columns: Array<CoreColumn> = [{
            representation: representations[0],
            parts,
            topDepth: minDepth,
            bottomDepth: maxDepth,
            gap: 1
        }]

        const partCenter = depths[part].topDepth + depths[part].length * 0.5
        for (let i = 1; i < representations.length; i++) {
            const {
                topDepth: lastTop,
                bottomDepth: lastBottom,
                gap: lastGap
            } = columns[i - 1]
            const depthRange = Math.pow(lastBottom - lastTop, 0.45)
            const depthCenter = clamp(
                partCenter,
                lastTop + depthRange * 0.5,
                lastBottom - depthRange * 0.5
            )
            const topDepth = depthCenter - depthRange * 0.5
            const bottomDepth = depthCenter + depthRange * 0.5
            const visibleParts = parts.filter(part => {
                if (!depths[part]) { return false }

                const partTopDepth = depths[part].topDepth
                const partBottomDepth = partTopDepth + depths[part].length

                return (partBottomDepth > topDepth && partTopDepth < bottomDepth)
            })
            const gap = 3 * lastGap

            columns.push({
                parts: visibleParts,
                representation: representations[i],
                topDepth,
                bottomDepth,
                gap
            })
        }
        setColumns(columns)
    }, [part, parts, representations, depths, minDepth, maxDepth])

    return <>
        <div className={'scale-column-labels'}>
            { columns.map((column, i) =>
                <ScaleColumnLabel
                    topDepth={column.topDepth}
                    bottomDepth={column.bottomDepth}
                    largeWidth={!!column.representation.largeWidth}
                    key={i}
                />
            ) }
        </div>
        <div className={'core-panel'}>
            { columns.map((column, i) =>
                <ScaleColumn
                    vis={vis}
                    part={part}
                    representation={column.representation}
                    parts={column.parts}
                    topDepth={column.topDepth}
                    bottomDepth={column.bottomDepth}
                    nextTopDepth={columns[i + 1]?.topDepth || finalTopDepth}
                    nextBottomDepth={columns[i + 1]?.bottomDepth || finalBottomDepth}
                    gap={column.gap}
                    setPart={setPart}
                    key={i}
                />
            ) }
        </div>
    </>
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
    representation, vis, part, parts, topDepth, bottomDepth,
    nextTopDepth, nextBottomDepth, gap, setPart
}: ScaleColumnProps): ReactElement {
    const [mToPx, setMToPx] = useState<number>(0)
    const [partCenter, setPartCenter] = useState<number>(0)
    const columnRef = useRef<HTMLDivElement>(null)
    const {
        element: RepresentationElement,
        fullScale = false,
        largeWidth = false
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

export default CorePanel

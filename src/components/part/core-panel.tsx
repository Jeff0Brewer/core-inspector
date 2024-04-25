import React, { useState, useEffect, useRef, ReactElement } from 'react'
import { PiArrowsVerticalLight } from 'react-icons/pi'
import { useCoreMetadata } from '../../hooks/core-metadata-context'
import { useCollapseRender } from '../../hooks/collapse-render'
import { clamp, getScale } from '../../lib/util'
import PartRenderer from '../../vis/part'
import { ScaleRepresentation } from '../../components/part/scale-representations'
import styles from '../../styles/part/core-panel.module.css'

const PART_WIDTH_M = 0.0525

type CoreColumn = {
    representation: ScaleRepresentation,
    parts: Array<string>,
    topDepth: number,
    bottomDepth: number,
    mToPx: number,
    gap: number
}

type CorePanelProps = {
    vis: PartRenderer | null,
    part: string,
    parts: Array<string>,
    representations: Array<ScaleRepresentation>,
    setPart: (p: string | null) => void,
    finalTopDepth?: number,
    finalBottomDepth?: number,
    open: boolean,
}

const CorePanel = React.memo(({
    vis, part, parts, representations, setPart, open,
    finalTopDepth = 0, finalBottomDepth = 0
}: CorePanelProps): ReactElement => {
    const [columns, setColumns] = useState<Array<CoreColumn>>([])
    const columnsRef = useRef<HTMLDivElement>(null)
    const { depths, topDepth: minDepth, bottomDepth: maxDepth } = useCoreMetadata()
    const render = useCollapseRender(open)

    // calculate all column depth ranges / visible parts when selected part changes
    useEffect(() => {
        const getColumns = (): void => {
            if (minDepth === null || maxDepth === null || !depths?.[part]) { return }
            if (!columnsRef.current) {
                throw new Error('No reference to dom elements')
            }

            const heightPx = columnsRef.current.clientHeight

            const columns: Array<CoreColumn> = [{
                representation: representations[0],
                parts,
                topDepth: minDepth,
                bottomDepth: maxDepth,
                gap: 1,
                mToPx: heightPx / (maxDepth - minDepth)
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

                    return partBottomDepth > topDepth && partTopDepth < bottomDepth
                })
                const gap = 3 * lastGap

                columns.push({
                    parts: visibleParts,
                    representation: representations[i],
                    topDepth,
                    bottomDepth,
                    mToPx: heightPx / (bottomDepth - topDepth),
                    gap
                })
            }

            setColumns(columns)
        }
        getColumns()

        window.addEventListener('resize', getColumns)
        return () => {
            window.removeEventListener('resize', getColumns)
        }
    }, [part, parts, representations, depths, minDepth, maxDepth])

    return <>
        <div className={styles.topLabels}>
            { render && columns.map((column, i) =>
                <ScaleColumnTopLabel
                    topDepth={column.topDepth}
                    bottomDepth={column.bottomDepth}
                    largeWidth={!!column.representation.largeWidth}
                    key={i}
                />
            ) }
        </div>
        <div className={styles.columns} ref={columnsRef}>
            { render && columns.map((column, i) => {
                const isLast = i === columns.length - 1
                return <ScaleColumn
                    vis={vis}
                    parts={column.parts}
                    part={part}
                    setPart={setPart}
                    representation={column.representation}
                    gap={column.gap}
                    topDepth={column.topDepth}
                    bottomDepth={column.bottomDepth}
                    mToPx={column.mToPx}
                    nextTopDepth={isLast ? finalTopDepth : columns[i + 1].topDepth}
                    nextBottomDepth={isLast ? finalBottomDepth : columns[i + 1].bottomDepth}
                    key={i}
                />
            }) }
            { render && depths && !depths[part] &&
                <p className={styles.dataMissing}>
                    data missing
                </p> }
        </div>
        <div className={`${styles.bottomLabels} ${!open && styles.hidden}`}>
            { render && columns.map((column, i) =>
                <ScaleColumnBottomLabel
                    pixelWidth={column.mToPx * PART_WIDTH_M}
                    largeWidth={!!column.representation.largeWidth}
                    key={i}
                />
            ) }
        </div>
    </>
})

type ScaleColumnProps = {
    vis: PartRenderer | null,
    parts: Array<string>,
    part: string,
    setPart: (p: string | null) => void,
    representation: ScaleRepresentation,
    gap: number,
    topDepth: number,
    bottomDepth: number,
    mToPx: number,
    nextTopDepth: number,
    nextBottomDepth: number,
}

const ScaleColumn = React.memo(({
    representation, vis, part, parts, topDepth, bottomDepth, mToPx,
    nextTopDepth, nextBottomDepth, gap, setPart
}: ScaleColumnProps): ReactElement => {
    const [partCenter, setPartCenter] = useState<number>(0)
    const columnRef = useRef<HTMLDivElement>(null)
    const { topDepth: minDepth, bottomDepth: maxDepth } = useCoreMetadata()
    const {
        element: RepresentationElement,
        fullScale = false,
        largeWidth = false
    } = representation

    const wrapStyle: React.CSSProperties = {}
    if (topDepth === minDepth) {
        wrapStyle.top = '0'
    } else if (bottomDepth === maxDepth) {
        wrapStyle.bottom = '0'
    } else if (!fullScale) {
        wrapStyle.transform = `translateY(-${partCenter * 100}%)`
        wrapStyle.top = '50%'
    }
    if (fullScale) {
        wrapStyle.height = '100%'
    }

    const windowTop = (nextTopDepth - topDepth) / (bottomDepth - topDepth)
    const windowBottom = (nextBottomDepth - topDepth) / (bottomDepth - topDepth)

    return <>
        <div
            ref={columnRef}
            className={`${styles.column} ${largeWidth && styles.largeWidth}`}
        >
            <div
                className={styles.nextWindow}
                style={{
                    top: `${windowTop * 100}%`,
                    bottom: `${(1 - windowBottom) * 100}%`
                }}
            ></div>
            <div className={styles.representation} style={wrapStyle}>
                <RepresentationElement
                    vis={vis}
                    part={part}
                    parts={parts}
                    mToPx={mToPx}
                    widthM={PART_WIDTH_M}
                    setCenter={setPartCenter}
                    setPart={setPart}
                    gap={gap}
                />
            </div>
        </div>
        <div className={styles.zoomLines}>
            { getZoomSvg(windowTop, windowBottom) }
        </div>
    </>
})

type ScaleColumnTopLabelProps = {
    topDepth: number,
    bottomDepth: number,
    largeWidth: boolean
}

const ScaleColumnTopLabel = React.memo((
    { topDepth, bottomDepth, largeWidth }: ScaleColumnTopLabelProps
): ReactElement => {
    const range = bottomDepth - topDepth
    return (
        <div className={styles.label}>
            <div className={`${styles.topBottomDepths} ${largeWidth && styles.largeWidth}`}>
                <p>{topDepth.toFixed(1)}</p>
                <p>{bottomDepth.toFixed(1)}</p>
            </div>
            <div className={styles.depthLabel}>
                <div className={styles.topBottomUnits}>
                    <p>m</p>
                    <p>m</p>
                </div>
                <div className={styles.rangeIcon}>
                    <PiArrowsVerticalLight />
                </div>
                <p className={styles.rangeLabel}>
                    {range.toFixed(range >= 100 ? 0 : 1)}m
                </p>
            </div>
        </div>
    )
})

type ScaleColumnBottomLabelProps = {
    pixelWidth: number,
    largeWidth: boolean
}

const ScaleColumnBottomLabel = React.memo((
    { pixelWidth, largeWidth }: ScaleColumnBottomLabelProps
): ReactElement => {
    return (
        <div className={styles.bottomLabel}>
            <p className={`${largeWidth && styles.largeWidth}`}>
                { getScale(pixelWidth) }
            </p>
        </div>
    )
})

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

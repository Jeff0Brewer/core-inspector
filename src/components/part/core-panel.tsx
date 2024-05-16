import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, ReactElement, RefObject } from 'react'
import { PiArrowsVerticalLight } from 'react-icons/pi'
import { useLastState } from '../../hooks/last-state'
import { useCoreMetadata } from '../../hooks/core-metadata-context'
import { useCollapseRender } from '../../hooks/collapse-render'
import { usePopupPosition } from '../../hooks/popup-position'
import { getPartId } from '../../lib/path'
import { clamp, lerp, getScale } from '../../lib/util'
import PartRenderer from '../../vis/part'
import { RepresentationElement } from '../../components/part/scale-representations'
import styles from '../../styles/part/core-panel.module.css'

const PART_WIDTH_M = 0.0525

type CoreColumn = {
    element: RepresentationElement,
    fullScale?: boolean,
    largeWidth?: boolean,
    gap: number,
    topDepth: number,
    bottomDepth: number,
    mToPx: number
}

type RepresentationSettings = Array<{
    element: RepresentationElement,
    fullScale?: boolean,
    largeWidth?: boolean
}>

type CorePanelProps = {
    vis: PartRenderer | null,
    part: string,
    representations: RepresentationSettings,
    setPart: (p: string | null) => void,
    finalTopDepth?: number,
    finalBottomDepth?: number,
    open: boolean,
}

const CorePanel = React.memo(({
    vis, part, representations, setPart, open, finalTopDepth = 0, finalBottomDepth = 0
}: CorePanelProps): ReactElement => {
    const [columns, setColumns] = useState<Array<CoreColumn>>([])
    const [hoveredPart, setHoveredPart] = useState<string | null>(null)
    const columnsRef = useRef<HTMLDivElement>(null)

    const render = useCollapseRender(open)
    const { depths, topDepth: minDepth, bottomDepth: maxDepth } = useCoreMetadata()

    // Calculates progression of depth range between columns
    // and scale values for each column's layout.
    useLayoutEffect(() => {
        const getColumns = (): void => {
            if (minDepth === null || maxDepth === null || !depths?.[part]) {
                return
            }
            if (!columnsRef.current) {
                throw new Error('No reference to dom elements')
            }

            const heightPx = columnsRef.current.clientHeight

            const columns: Array<CoreColumn> = [{
                element: representations[0].element,
                fullScale: representations[0].fullScale,
                largeWidth: representations[0].largeWidth,
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
                const mToPx = heightPx / (bottomDepth - topDepth)

                columns.push({
                    element: representations[i].element,
                    fullScale: representations[i].fullScale,
                    largeWidth: representations[i].largeWidth,
                    gap: 3 * lastGap,
                    topDepth,
                    bottomDepth,
                    mToPx
                })
            }

            setColumns(columns)
        }
        getColumns()

        window.addEventListener('resize', getColumns)
        return () => {
            window.removeEventListener('resize', getColumns)
        }
    }, [part, representations, depths, minDepth, maxDepth])

    const navigateToPart = useCallback((part: string | null): void => {
        setPart(part)
        setHoveredPart(null)
    }, [setPart])

    return <>
        <div className={styles.topLabels}>
            { render && columns.map(({ topDepth, bottomDepth, largeWidth }, i) =>
                <ScaleColumnTopLabel
                    topDepth={topDepth}
                    bottomDepth={bottomDepth}
                    largeWidth={!!largeWidth}
                    key={i}
                />
            ) }
        </div>
        <div className={styles.columns} ref={columnsRef}>
            <CorePanelTooltip hoveredPart={hoveredPart} />
            { render && columns.map((column, i) => {
                const isLast = i === columns.length - 1
                return <ScaleColumn
                    vis={vis}
                    part={part}
                    setPart={navigateToPart}
                    setHoveredPart={setHoveredPart}
                    column={column}
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
            { render && columns.map(({ mToPx, largeWidth }, i) =>
                <ScaleColumnBottomLabel
                    pixelWidth={mToPx * PART_WIDTH_M}
                    largeWidth={!!largeWidth}
                    key={i}
                />
            ) }
        </div>
    </>
})

type ScaleColumnProps = {
    vis: PartRenderer | null,
    part: string,
    column: CoreColumn,
    nextTopDepth: number,
    nextBottomDepth: number,
    setPart: (p: string | null) => void,
    setHoveredPart: (p: string | null) => void
}

const ScaleColumn = React.memo(({
    vis, part, column, nextTopDepth, nextBottomDepth, setPart, setHoveredPart
}: ScaleColumnProps): ReactElement => {
    const [visibleParts, setVisibleParts] = useState<Array<string>>([])
    const [partCenter, setPartCenter] = useState<number>(0)
    const [partCenterWindow, setPartCenterWindow] = useState<number>(0)
    const [representationStyle, setRepresentationStyle] = useState<React.CSSProperties>({})
    const [windowStyle, setWindowStyle] = useState<React.CSSProperties>({})
    const lastPart = useLastState(part)
    const [visibleTopDepth, setVisibleTopDepth] = useState<number | null>(null)
    const [visibleBottomDepth, setVisibleBottomDepth] = useState<number | null>(null)
    const partRef = useRef<HTMLDivElement>(null)
    const columnRef = useRef<HTMLDivElement>(null)
    const windowRef = useRef<HTMLDivElement>(null)
    const { partIds, depths } = useCoreMetadata()
    const [transitioning, setTransitioning] = useState<boolean>(false)

    const {
        topDepth, bottomDepth, mToPx, gap, fullScale, largeWidth,
        element: RepresentationElement
    } = column

    useEffect(() => {
        if (visibleTopDepth === null) {
            setVisibleTopDepth(topDepth)
        } else {
            setVisibleTopDepth(Math.min(topDepth, visibleTopDepth))
        }
    }, [topDepth, visibleTopDepth])

    useEffect(() => {
        if (visibleBottomDepth === null) {
            setVisibleBottomDepth(bottomDepth)
        } else {
            setVisibleBottomDepth(Math.max(bottomDepth, visibleBottomDepth))
        }
    }, [bottomDepth, visibleBottomDepth])

    useLayoutEffect(() => {
        setTransitioning(lastPart !== null)
        const timeoutId = window.setTimeout(() => {
            setVisibleTopDepth(topDepth)
            setVisibleBottomDepth(bottomDepth)
            setTransitioning(false)
        }, 1200)
        return () => {
            window.clearTimeout(timeoutId)
        }
    }, [lastPart, topDepth, bottomDepth])

    useLayoutEffect(() => {
        if (visibleTopDepth === null || visibleBottomDepth === null || partIds === null) {
            return
        }

        const visibleParts = partIds.filter(part => {
            if (!depths?.[part]) { return false }

            const partTopDepth = depths[part].topDepth
            const partBottomDepth = partTopDepth + depths[part].length

            return partBottomDepth > visibleTopDepth && partTopDepth < visibleBottomDepth
        })
        setVisibleParts(visibleParts)
    }, [partIds, depths, visibleTopDepth, visibleBottomDepth])

    useEffect(() => {
        if (fullScale) {
            setRepresentationStyle({
                height: '100%'
            })
        } else {
            const columnHeight = columnRef.current?.getBoundingClientRect().height
            if (!columnHeight) { return }
            const minY = `calc(-100% + ${columnHeight * 0.5}px)`
            const centerY = `-${partCenter * 100}%`
            const maxY = `-${columnHeight * 0.5}px`
            setRepresentationStyle({
                top: '50%',
                transform: `translateY(clamp(${minY}, ${centerY}, ${maxY}))`,
                transition: lastPart === null ? '' : 'transform 1s ease'
            })
        }
    }, [partCenter, fullScale, lastPart])

    useEffect(() => {
        if (!largeWidth) { return }

        if (transitioning || !partRef.current || !columnRef.current || !depths?.[part]) { return }
        const { top: columnTop } = columnRef.current.getBoundingClientRect()
        const { top: partTop, bottom: partBottom } = partRef.current.getBoundingClientRect()
        const windowMin = partTop - columnTop
        const windowMax = partBottom - columnTop
        const depthMin = depths[part].topDepth
        const depthMax = depths[part].topDepth + depths[part].length
        const windowTop = lerp(windowMin, windowMax, (nextTopDepth - depthMin) / (depthMax - depthMin))
        const windowBottom = lerp(windowMin, windowMax, (nextBottomDepth - depthMin) / (depthMax - depthMin))

        setWindowStyle({
            transform: `translateY(${windowTop}px`,
            height: `${windowBottom - windowTop}px`
        })
    }, [largeWidth, depths, part, nextTopDepth, nextBottomDepth, transitioning])

    useLayoutEffect(() => {
        if (largeWidth) { return }

        const columnHeight = (bottomDepth - topDepth) * mToPx
        const windowHeight = (nextBottomDepth - nextTopDepth) * mToPx
        const windowY = clamp(
            partCenterWindow * columnHeight - windowHeight * 0.5,
            0,
            columnHeight - windowHeight
        )
        setWindowStyle({
            transform: `translateY(${windowY}px)`,
            height: `${windowHeight}px`,
            transition: lastPart === null ? '' : 'transform 1s ease, height 1s ease'
        })
    }, [topDepth, bottomDepth, nextTopDepth, nextBottomDepth, mToPx, largeWidth, lastPart, partCenterWindow])

    const windowHidden = nextTopDepth === nextBottomDepth || (largeWidth && transitioning)

    return <>
        <div
            ref={columnRef}
            className={`${styles.column} ${largeWidth && styles.largeWidth}`}
        >
            <div
                ref={windowRef}
                className={`${styles.nextWindow} ${windowHidden && styles.windowHidden}`}
                style={windowStyle}
            ></div>
            <div className={styles.representation} style={representationStyle}>
                <RepresentationElement
                    vis={vis}
                    part={part}
                    parts={visibleParts}
                    topDepth={topDepth}
                    bottomDepth={bottomDepth}
                    mToPx={mToPx}
                    widthM={PART_WIDTH_M}
                    setCenter={setPartCenter}
                    setCenterWindow={setPartCenterWindow}
                    setPart={setPart}
                    setHoveredPart={setHoveredPart}
                    partRef={partRef}
                    gap={gap}
                />
            </div>
        </div>
        <div className={`${styles.zoomLines} ${windowHidden && styles.windowHidden}`}>
            <ZoomLines
                windowRef={windowRef}
                columnRef={columnRef}
                transitioning={transitioning}
                styleDependency={windowStyle}
            />
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

type ZoomLinesProps = {
    windowRef: RefObject<HTMLDivElement>,
    columnRef: RefObject<HTMLDivElement>,
    transitioning?: boolean,
    styleDependency?: React.CSSProperties
}

const ZoomLines = React.memo((
    { windowRef, columnRef, transitioning, styleDependency }: ZoomLinesProps
): ReactElement => {
    const [points, setPoints] = useState<string>('')

    useLayoutEffect(() => {
        const updateWindowPosition = (): void => {
            if (!windowRef.current || !columnRef.current) { return }

            const { top: windowTop, bottom: windowBottom } = windowRef.current.getBoundingClientRect()
            const { top: columnTop, height: columnHeight } = columnRef.current.getBoundingClientRect()

            const topPercent = 100 * (windowTop - columnTop) / columnHeight
            const bottomPercent = 100 * (windowBottom - columnTop) / columnHeight

            setPoints(`0,${topPercent} 0,${bottomPercent} 100,100 100,0`)
        }

        // loop animation frames to update svg until no longer transitioning
        if (transitioning) {
            let frameId = -1
            const animate = (): void => {
                updateWindowPosition()
                frameId = window.requestAnimationFrame(animate)
            }
            animate()

            return () => {
                window.cancelAnimationFrame(frameId)
            }
        }

        updateWindowPosition()
    }, [windowRef, columnRef, transitioning, styleDependency])

    return (
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polygon fill="#1d1d1e" points={points} />
        </svg>
    )
})

type CorePanelTooltipProps = {
    hoveredPart: string | null
}

function CorePanelTooltip ({ hoveredPart }: CorePanelTooltipProps): ReactElement {
    const [validPart, setValidPart] = useState<string>('')
    const popupRef = useRef<HTMLDivElement>(null)
    usePopupPosition(popupRef)

    useEffect(() => {
        if (hoveredPart !== null) {
            setValidPart(hoveredPart)
        }
    }, [hoveredPart])

    return (
        <div
            ref={popupRef}
            className={`${styles.tooltip} ${hoveredPart && styles.tooltipVisible}`}
        >
            {validPart && getPartId(validPart)}
        </div>
    )
}

export type { RepresentationSettings }
export default CorePanel

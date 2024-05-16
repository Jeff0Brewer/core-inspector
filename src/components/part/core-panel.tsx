import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useLayoutEffect,
    useRef,
    useCallback,
    ReactElement,
    RefObject,
    MutableRefObject
} from 'react'
import { PiArrowsVerticalLight } from 'react-icons/pi'
import { useLastState } from '../../hooks/last-state'
import { useCoreMetadata } from '../../hooks/core-metadata-context'
import { useCollapseRender } from '../../hooks/collapse-render'
import { usePopupPosition } from '../../hooks/popup-position'
import { useTransitionBounds } from '../../hooks/transition-bounds'
import { getPartId } from '../../lib/path'
import { clamp, mapBounds, getScale } from '../../lib/util'
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

type ScrollDepth = {
    topDepth: number,
    bottomDepth: number
}

type CorePanelContextProps = {
    columns: Array<CoreColumn>,
    scrollDepthRef: MutableRefObject<ScrollDepth>
}

const CorePanelContext = createContext<CorePanelContextProps | null>(null)

const useCorePanelContext = (): CorePanelContextProps => {
    const context = useContext(CorePanelContext)
    if (context === null) {
        throw new Error('useCorePanelContext must be called from a child of CorePanelProvider')
    }
    return context
}

type CorePanelProps = {
    vis: PartRenderer | null,
    part: string,
    representations: RepresentationSettings,
    setPart: (p: string | null) => void,
    scrollDepthRef: MutableRefObject<ScrollDepth>,
    open: boolean
}

const CorePanel = React.memo(({
    vis, part, representations, setPart, open, scrollDepthRef
}: CorePanelProps): ReactElement => {
    const [columns, setColumns] = useState<Array<CoreColumn>>([])
    const [hoveredPart, setHoveredPart] = useState<string | null>(null)
    const columnsRef = useRef<HTMLDivElement>(null)

    const { depths, topDepth: minDepth, bottomDepth: maxDepth } = useCoreMetadata()
    const render = useCollapseRender(open)

    // Calculates progression of depth range between columns
    // and scale values for each column's layout.
    useLayoutEffect(() => {
        const getColumns = (): void => {
            if (!columnsRef.current || minDepth === null || maxDepth === null || !depths?.[part]) {
                return
            }

            const partCenter = depths[part].topDepth + depths[part].length * 0.5
            const heightPx = columnsRef.current.clientHeight

            const { element, fullScale, largeWidth } = representations[0]
            const columns: Array<CoreColumn> = [{
                element,
                fullScale,
                largeWidth,
                topDepth: minDepth,
                bottomDepth: maxDepth,
                gap: 1,
                mToPx: heightPx / (maxDepth - minDepth)
            }]

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
                const gap = lastGap * 3

                const { element, fullScale, largeWidth } = representations[i]
                columns.push({
                    element, fullScale, largeWidth, topDepth, bottomDepth, mToPx, gap
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

    return <CorePanelContext.Provider value={{ columns, scrollDepthRef }}>
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
            { render && columns.map((_, i) =>
                <ScaleColumn
                    vis={vis}
                    part={part}
                    setPart={navigateToPart}
                    setHoveredPart={setHoveredPart}
                    index={i}
                    key={i}
                />
            ) }
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
    </CorePanelContext.Provider>
})

type ScaleColumnProps = {
    vis: PartRenderer | null,
    part: string,
    setPart: (p: string | null) => void,
    setHoveredPart: (p: string | null) => void,
    index: number
}

const ScaleColumn = React.memo(({
    vis, part, setPart, setHoveredPart, index
}: ScaleColumnProps): ReactElement => {
    const [visibleParts, setVisibleParts] = useState<Array<string>>([])
    const [partCenter, setPartCenter] = useState<number>(0)
    const [partCenterWindow, setPartCenterWindow] = useState<number>(0)
    const [representationStyle, setRepresentationStyle] = useState<React.CSSProperties>({})
    const [windowStyle, setWindowStyle] = useState<React.CSSProperties>({})
    const partRef = useRef<HTMLDivElement>(null)
    const columnRef = useRef<HTMLDivElement>(null)
    const windowRef = useRef<HTMLDivElement>(null)
    const lastPart = useLastState(part)
    const { partIds, depths } = useCoreMetadata()

    const { columns } = useCorePanelContext()
    const column = columns[index]

    let nextTopDepth: number = 0
    let nextBottomDepth: number = 0
    if (index < columns.length - 1) {
        nextTopDepth = columns[index + 1].topDepth
        nextBottomDepth = columns[index + 1].bottomDepth
    }

    const {
        topDepth, bottomDepth, mToPx, gap, fullScale, largeWidth,
        element: RepresentationElement
    } = column
    const {
        min: visibleTopDepth,
        max: visibleBottomDepth,
        transitioning
    } = useTransitionBounds(topDepth, bottomDepth)

    useLayoutEffect(() => {
        if (visibleTopDepth === null || visibleBottomDepth === null || partIds === null) {
            return
        }

        setVisibleParts(partIds.filter(part => {
            if (!depths?.[part]) { return false }

            const partTopDepth = depths[part].topDepth
            const partBottomDepth = partTopDepth + depths[part].length

            return partBottomDepth > visibleTopDepth && partTopDepth < visibleBottomDepth
        }))
    }, [partIds, depths, visibleTopDepth, visibleBottomDepth])

    useEffect(() => {
        if (fullScale) {
            setRepresentationStyle({ height: '100%' })
            return
        }

        const columnHeight = columnRef.current?.clientHeight
        if (!columnHeight) { return }

        setRepresentationStyle({
            top: '50%',
            transform: `translateY(clamp(
                calc(-100% + ${columnHeight * 0.5}px), 
                -${partCenter * 100}%, 
                -${columnHeight * 0.5}px
            ))`,
            transition: lastPart === null ? '' : 'transform 1s ease'
        })
    }, [partCenter, fullScale, largeWidth, lastPart])

    useLayoutEffect(() => {
        if (!largeWidth) { return }
        if (transitioning || !partRef.current || !columnRef.current || !depths?.[part]) { return }

        const { top: columnTopPx } = columnRef.current.getBoundingClientRect()
        const { top: partTopPx, bottom: partBottomPx } = partRef.current.getBoundingClientRect()

        const minM = depths[part].topDepth
        const maxM = minM + depths[part].length

        const minPx = partTopPx - columnTopPx
        const maxPx = partBottomPx - columnTopPx

        const windowTop = mapBounds(nextTopDepth, minM, maxM, minPx, maxPx)
        const windowBottom = mapBounds(nextBottomDepth, minM, maxM, minPx, maxPx)

        setWindowStyle({
            transform: `translateY(${windowTop}px`,
            height: `${windowBottom - windowTop}px`
        })
    }, [largeWidth, depths, part, nextTopDepth, nextBottomDepth, transitioning])

    useLayoutEffect(() => {
        if (largeWidth) { return }

        const columnHeight = (bottomDepth - topDepth) * mToPx
        const windowHeight = (nextBottomDepth - nextTopDepth) * mToPx
        const windowCenter = partCenterWindow * columnHeight

        setWindowStyle({
            height: `${windowHeight}px`,
            transform: `translateY(clamp(
                0px,
                ${windowCenter - windowHeight * 0.5}px,
                ${columnHeight - windowHeight}px
            ))`,
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
                    gap={gap}
                    widthM={PART_WIDTH_M}
                    partRef={partRef}
                    setCenter={setPartCenter}
                    setCenterWindow={setPartCenterWindow}
                    setPart={setPart}
                    setHoveredPart={setHoveredPart}
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

export default CorePanel
export type {
    RepresentationSettings,
    ScrollDepth
}

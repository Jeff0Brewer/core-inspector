import { ReactElement, useState, useEffect } from 'react'
import styles from '../../styles/generic/svg-plot.module.css'

type SvgPlotElementProps = {
    data: Array<number>,
    fill?: string,
    fillOpacity?: string,
    stroke?: string,
    strokeWidth?: string
    strokeDash?: string
}

function SvgPlotElement (
    { data, fill = '#fff', fillOpacity = '1', stroke = '#fff', strokeWidth = '1', strokeDash = '0' }: SvgPlotElementProps
): ReactElement {
    const [points, setPoints] = useState<string>('')

    useEffect(() => {
        const points = []
        const xInc = 100 / (data.length - 1)
        for (let i = 0; i < data.length; i++) {
            points.push(`${i * xInc},${(1 - (data[i] / 255)) * 100}`)
        }

        setPoints(points.join(' '))
    }, [data])

    return <>
        <svg
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDash}
            fill={'transparent'}
            viewBox={'0 0 100 100'}
            preserveAspectRatio={'none'}
        >
            <polyline points={points} vectorEffect={'non-scaling-stroke'} />
        </svg>
        <svg
            fill={fill}
            fillOpacity={fillOpacity}
            viewBox={'0 0 100 100'}
            preserveAspectRatio={'none'}
        >
            <polygon points={`100,100 0,100 ${points} 100,100`} />
        </svg>
    </>
}

type SvgPlotTicks = {
    min: number,
    max: number,
    step: number
}

type SvgPlotProps = {
    elements: Array<SvgPlotElementProps>,
    customClass?: string,
    labelX?: string,
    labelY?: string,
    ticksX?: SvgPlotTicks
    ticksY?: SvgPlotTicks
}

function SvgPlot (
    { elements, customClass, labelX, labelY, ticksX, ticksY }: SvgPlotProps
): ReactElement {
    const [tickValuesX, setTickValuesX] = useState<Array<number>>([])
    const [tickValuesY, setTickValuesY] = useState<Array<number>>([])

    useEffect(() => {
        if (!ticksX) { return }

        const tickValuesX = []
        const { min, max, step } = ticksX
        for (let i = min; i <= max; i += step) {
            tickValuesX.push(i)
        }

        setTickValuesX(tickValuesX)
    }, [ticksX])

    useEffect(() => {
        if (!ticksY) { return }

        const tickValuesY = []
        const { min, max, step } = ticksY
        for (let i = max; i >= min; i -= step) {
            tickValuesY.push(i)
        }

        setTickValuesY(tickValuesY)
    }, [ticksY])

    return (
        <div className={`${styles.svgPlot} ${customClass}`}>
            <div className={styles.axisY}>
                { ticksY && <div className={styles.ticksY}>
                    { tickValuesY.map((value, i) =>
                        <div className={styles.tickY} key={i}>
                            <p>{value}</p>
                        </div>
                    ) }
                </div> }
                { labelY && <p className={styles.labelY}>
                    {labelY}
                </p> }
            </div>
            <div className={styles.plotWrap}>
                { elements.map((props, i) =>
                    <SvgPlotElement {...props} key={i} />
                ) }
            </div>
            <div className={styles.axisX}>
                { ticksX && <div className={styles.ticksX}>
                    { tickValuesX.map((value, i) =>
                        <div className={styles.tickX} key={i}>
                            <p>{value}</p>
                        </div>
                    ) }
                </div> }
                { labelX && <p className={styles.labelX}>
                    {labelX}
                </p> }
            </div>
        </div>
    )
}

export default SvgPlot

import { ReactElement, useState, useEffect } from 'react'
import { clamp } from '../../lib/util'
import styles from '../../styles/generic/svg-plot.module.css'

type SvgPlotElementSettings = {
    x: Array<number>,
    y: Array<number>,
    fill?: string,
    fillOpacity?: string,
    stroke?: string,
    strokeWidth?: string,
    strokeDash?: string,
}

type SvgPlotElementProps = SvgPlotElementSettings & {
    xBounds: [number, number],
    yBounds: [number, number],
}

function SvgPlotElement ({
    x, y, xBounds, yBounds,
    fill = '#fff',
    fillOpacity = '1',
    stroke = '#fff',
    strokeWidth = '1',
    strokeDash = '0'
}: SvgPlotElementProps): ReactElement {
    const [points, setPoints] = useState<string>('')

    useEffect(() => {
        // TODO: add error message if x / y not same length
        if (x.length !== y.length) { return }

        const [xMin, xMax] = xBounds
        const [yMin, yMax] = yBounds

        const points = []
        for (let i = 0; i < x.length; i++) {
            const normX = (x[i] - xMin) / (xMax - xMin)
            const normY = (y[i] - yMin) / (yMax - yMin)

            if (normX >= 0 && normX <= 1) {
                points.push(`${normX * 100},${(1 - normY) * 100}`)
            }
        }

        setPoints(points.join(' '))
    }, [x, y, xBounds, yBounds])

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

type SvgPlotAxisSettings = {
    bounds: [number, number],
    tickStep?: number,
    label?: string,
}

type SvgPlotAxisProps = SvgPlotAxisSettings & {
    direction: 'x' | 'y'
}

function SvgPlotAxis (
    { direction, bounds, tickStep, label }: SvgPlotAxisProps
): ReactElement {
    const [tickValues, setTickValues] = useState<Array<number>>([])

    useEffect(() => {
        if (tickStep) {
            const tickValues = []
            for (let i = bounds[0]; i <= bounds[1]; i += tickStep) {
                tickValues.push(i)
            }
            setTickValues(tickValues)
        }
    }, [bounds, tickStep])

    return (
        <div className={direction === 'x' ? styles.axisX : styles.axisY}>
            { tickValues.length !== 0 &&
                <div className={styles.ticks}>
                    { tickValues.map((value, i) =>
                        <div className={styles.tick} key={i}>
                            <p>{value}</p>
                        </div>
                    ) }
                </div> }
            { label && <p className={styles.label}>{label}</p> }
        </div>
    )
}

type SvgPlotProps = {
    elements: Array<SvgPlotElementSettings>,
    axisX: SvgPlotAxisSettings,
    axisY: SvgPlotAxisSettings,
    customClass?: string,
}

function SvgPlot (
    { elements, axisX, axisY, customClass }: SvgPlotProps
): ReactElement {
    return (
        <div className={`${styles.svgPlot} ${customClass}`}>
            <SvgPlotAxis direction={'y'} {...axisY} />
            <div className={styles.plotWrap}>
                { elements.map((element, i) =>
                    <SvgPlotElement
                        {...element}
                        xBounds={axisX.bounds}
                        yBounds={axisY.bounds}
                        key={i}
                    />
                ) }
            </div>
            <SvgPlotAxis direction={'x'} {...axisX} />
        </div>
    )
}

export default SvgPlot

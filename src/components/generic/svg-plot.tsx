import { ReactElement, useState, useEffect } from 'react'
import styles from '../../styles/generic/svg-plot.module.css'

type SvgPlotProps = {
    data: Array<number>,
    fill?: string,
    fillOpacity?: string
    stroke?: string,
    strokeWidth?: string
}

function SvgPlot (
    { data, fill = '#fff', fillOpacity = '1', stroke = '#fff', strokeWidth = '1' }: SvgPlotProps
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

    return (
        <div className={styles.svgPlot}>
            <svg
                stroke={stroke}
                strokeWidth={strokeWidth}
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
        </div>
    )
}

export default SvgPlot

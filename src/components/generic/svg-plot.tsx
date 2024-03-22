import { ReactElement, useState, useEffect } from 'react'
import styles from '../../styles/generic/svg-plot.module.css'

type SvgPlotProps = {
    data: Array<number>
}

function SvgPlot (
    { data }: SvgPlotProps
): ReactElement {
    const [points, setPoints] = useState<string>('')

    useEffect(() => {
        const points = ['100,100', '0,100']
        const xInc = 100 / (data.length - 1)
        for (let i = 0; i < data.length; i++) {
            points.push(`${i * xInc},${(1 - (data[i] / 255)) * 100}`)
        }
        points.push('100,100')

        setPoints(points.join(' '))
    }, [data])

    return (
        <div className={styles.svgPlot}>
            <svg fill={'#fff'} viewBox={'0 0 100 100'} preserveAspectRatio={'none'}>
                <polygon points={points} />
            </svg>
        </div>
    )
}

export default SvgPlot

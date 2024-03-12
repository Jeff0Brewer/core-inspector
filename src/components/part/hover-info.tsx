import { useRef, useState, useEffect, ReactElement } from 'react'
import { usePopupPosition } from '../../hooks/popup-position'
import { StringMap } from '../../lib/util'
import styles from '../../styles/part/hover-info.module.css'

type PartHoverInfoProps = {
    abundances: StringMap<number>,
    spectrum: Array<number>,
    visible: boolean
}

function PartHoverInfo (
    { abundances, spectrum, visible }: PartHoverInfoProps
): ReactElement {
    const popupRef = useRef<HTMLDivElement>(null)
    usePopupPosition(popupRef)

    return (
        <div
            ref={popupRef}
            className={`${styles.hoverInfo} ${visible && styles.visible}`}
        >
            <div className={styles.abundances}>
                {Object.entries(abundances).map(([mineral, abundance], i) =>
                    <div className={styles.abundanceBar} key={i}>
                        <div
                            className={styles.abundance}
                            style={{ height: `${(abundance / 255) * 80}%` }}
                        ></div>
                        <p>{mineral.substring(0, 2)}</p>
                    </div>
                )}
            </div>
            <div className={styles.spectrum}>
                <SvgPlot data={spectrum} />
            </div>
        </div>
    )
}

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
            points.push(`${i * xInc},${(1 - data[i]) * 100}`)
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

export default PartHoverInfo

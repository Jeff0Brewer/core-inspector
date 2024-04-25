import { useRef, useEffect, useState, ReactElement } from 'react'
import { usePopupPosition } from '../../hooks/popup-position'
import { StringMap } from '../../lib/util'
import styles from '../../styles/part/hover-info.module.css'

type HoverInfoProps = {
    abundanceWorker: Worker | null,
    spectrumWorker: Worker | null,
    setSelectedSpectrum: (s: Array<number> | null) => void,
    setSpectrumPosition: (p: [number, number]) => void
}

function HoverInfo ({
    abundanceWorker, spectrumWorker,
    setSelectedSpectrum, setSpectrumPosition
}: HoverInfoProps): ReactElement {
    const [abundances, setAbundances] = useState<StringMap<number>>({})
    const [spectrum, setSpectrum] = useState<Array<number> | null>([])

    useEffect(() => {
        if (!abundanceWorker) { return }

        const updateAbundances = ({ data }: MessageEvent): void => {
            setAbundances(data.abundances)
        }

        abundanceWorker.addEventListener('message', updateAbundances)
        return () => {
            abundanceWorker.removeEventListener('message', updateAbundances)
        }
    }, [abundanceWorker])

    useEffect(() => {
        if (!spectrumWorker) { return }

        const updateSpectrum = ({ data }: MessageEvent): void => {
            if (data.type === 'hovered') {
                setSpectrum(data.spectrum)
            } else if (data.type === 'clicked') {
                setSelectedSpectrum(data.spectrum)
                setSpectrumPosition([data.x, data.y])
            }
        }

        spectrumWorker.addEventListener('message', updateSpectrum)
        return () => {
            spectrumWorker.removeEventListener('message', updateSpectrum)
        }
    }, [spectrumWorker, setSelectedSpectrum, setSpectrumPosition])

    const popupRef = useRef<HTMLDivElement>(null)
    usePopupPosition(popupRef)

    return (
        <div
            ref={popupRef}
            className={`${styles.hoverInfo} ${styles.visible}`}
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
                { Array.isArray(spectrum) &&
                    <SvgPlot data={spectrum} /> }
                { spectrum === null &&
                    <p className={styles.dataMissing}>
                        data missing
                    </p> }
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
        const maxValue = Math.max(...data, 0.1)
        const xStep = 100 / (data.length - 1)

        const pointList = []
        for (let i = 0; i < data.length; i++) {
            const x = i * xStep
            const y = (1 - data[i] / maxValue) * 100
            pointList.push(`${x},${y}`)
        }

        setPoints(`100,100 0,100 ${pointList.join(' ')} 100,100`)
    }, [data])

    return (
        <svg fill={'#fff'} viewBox={'0 0 100 100'} preserveAspectRatio={'none'}>
            <polygon points={points} />
        </svg>
    )
}

export default HoverInfo

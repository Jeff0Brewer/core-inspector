import { useRef, useEffect, useState, ReactElement } from 'react'
import { usePopupPosition } from '../../hooks/popup-position'
import { SpectraPanelProps } from '../../components/part/spectra-panel'
import { StringMap } from '../../lib/util'
import styles from '../../styles/part/hover-info.module.css'

type HoverInfoProps = {
    visible: boolean,
    mineralChannels: Array<string>,
    abundanceWorker: Worker | null,
    spectrumWorker: Worker | null,
    setSelectedSpectrum: (s: SpectraPanelProps) => void,
}

function HoverInfo ({
    visible, mineralChannels, abundanceWorker, spectrumWorker, setSelectedSpectrum
}: HoverInfoProps): ReactElement {
    const [abundances, setAbundances] = useState<StringMap<number>>({})
    const [spectrum, setSpectrum] = useState<Array<number> | null>([])
    const popupRef = useRef<HTMLDivElement>(null)

    usePopupPosition(popupRef)

    useEffect(() => {
        if (!abundanceWorker) { return }

        const updateAbundances = ({ data }: MessageEvent): void => {
            const abundances: StringMap<number> = data.abundances
            setAbundances(abundances)

            // Send mineral with maximum abundance to spectrum worker
            // to set selected library spectra on spectrum panel open.
            spectrumWorker?.postMessage({
                type: 'abundance',
                maxMineral: Object.keys(abundances).reduce(
                    (a, b) => abundances[a] > abundances[b] ? a : b,
                    'epidote'
                )
            })
        }

        abundanceWorker.addEventListener('message', updateAbundances)
        return () => {
            abundanceWorker.removeEventListener('message', updateAbundances)
        }
    }, [abundanceWorker, spectrumWorker])

    useEffect(() => {
        if (!spectrumWorker) { return }

        const updateSpectrum = ({ data }: MessageEvent): void => {
            if (data.type === 'hovered') {
                setSpectrum(data.spectrum)
            } else if (data.type === 'clicked') {
                setSelectedSpectrum({
                    selectedSpectrum: data.spectrum,
                    spectrumPosition: [data.x, data.y],
                    maxMineral: data.maxMineral
                })
            }
        }

        spectrumWorker.addEventListener('message', updateSpectrum)
        return () => {
            spectrumWorker.removeEventListener('message', updateSpectrum)
        }
    }, [spectrumWorker, setSelectedSpectrum])

    return (
        <div
            ref={popupRef}
            className={`${styles.hoverInfo} ${visible && styles.visible}`}
        >
            <div className={styles.abundances}>
                <div className={styles.abundanceBar} key={'hydration'}>
                    <div
                        className={styles.abundance}
                        style={{ height: `${(abundances?.hydration || 0) * 80}%` }}
                    ></div>
                    <p className={styles.hydrationLabel}>h2o</p>
                </div>
                {mineralChannels.map(mineral =>
                    <div className={styles.abundanceBar} key={mineral}>
                        <div
                            className={styles.abundance}
                            style={{ height: `${(abundances?.[mineral] || 0) * 80}%` }}
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

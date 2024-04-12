import { ReactElement, useState, useEffect } from 'react'
import { PiCaretRightBold } from 'react-icons/pi'
import styles from '../../styles/part/spectra-panel.module.css'

import { Line } from 'react-chartjs-2'
import { Chart, LinearScale, LineElement, PointElement, Filler, Tooltip, ChartOptions } from 'chart.js'
Chart.register(LinearScale, LineElement, PointElement, Filler, Tooltip)
Chart.defaults.color = '#ccc'
Chart.defaults.font.family = 'system-ui'
const CHART_OPTIONS: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        tooltip: {
            mode: 'x',
            intersect: false,
            displayColors: false
        }
    },
    elements: {
        point: {
            radius: 0,
            hoverRadius: 0
        }
    },
    scales: {
        x: {
            type: 'linear',
            title: {
                display: true,
                text: 'WAVELENGTH',
                font: {
                    size: 14,
                    weight: 200
                }
            },
            border: {
                color: '#fff'
            },
            grid: {
                tickColor: '#ccc',
                color: 'transparent'
            },
            ticks: {
                font: {
                    size: 10
                }
            },
            bounds: 'data'
        },
        y: {
            type: 'linear',
            beginAtZero: true,
            title: {
                display: true,
                text: 'REFLECTANCE',
                font: {
                    size: 14,
                    weight: 200
                }
            },
            border: {
                color: '#fff'
            },
            grid: {
                tickColor: '#ccc',
                color: 'transparent'
            },
            ticks: {
                font: {
                    size: 10
                }
            },
            bounds: 'data'
        }
    }
}

type SpectraPanelProps = {
    spectra: Array<number>
}

function SpectraPanel (
    { spectra }: SpectraPanelProps
): ReactElement {
    const [open, setOpen] = useState<boolean>(false)

    useEffect(() => {
        setOpen(spectra.length > 0)
    }, [spectra])

    return (
        <div className={`${styles.spectraPanelWrap} ${open && styles.panelOpen}`}>
            <div className={styles.spectraPanel}>
                <button
                    className={styles.collapseButton}
                    onClick={() => setOpen(false)}
                >
                    <PiCaretRightBold />
                </button>
                <div className={styles.mainPlot}>
                    <Line
                        data={{
                            datasets: [{
                                data: convData(
                                    spectra.map((_, i) => i),
                                    spectra
                                ),
                                borderColor: '#fff',
                                borderWidth: 2,
                                backgroundColor: 'rgba(255, 255, 255, 0.35)',
                                fill: 'stack'
                            }]
                        }}
                        options={CHART_OPTIONS}
                    />
                </div>
            </div>
        </div>
    )
}

function convData (x: Array<number>, y: Array<number>): Array<{x: number, y: number}> {
    if (x.length !== y.length) {
        throw new Error('Different num of x and y values')
    }
    const data: Array<{x: number, y: number}> = []
    for (let i = 0; i < x.length; i++) {
        data.push({
            x: x[i],
            y: y[i]
        })
    }

    return data
}

export default SpectraPanel

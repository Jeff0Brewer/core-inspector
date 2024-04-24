import {
    Chart, ChartData, ChartOptions,
    Plugin, Tooltip, Filler, Tick,
    LinearScale, LineElement, PointElement
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import React, { ReactElement, useState, useEffect } from 'react'
import { PiCaretRightBold } from 'react-icons/pi'
import { StringMap, lerp } from '../../lib/util'
import { fetchJson } from '../../lib/load'
import Dropdown from '../../components/generic/dropdown'
import { useCollapseRender } from '../../hooks/collapse-render'
import styles from '../../styles/part/spectra-panel.module.css'
import spectraDropdownStyles from '../../styles/custom/spectra-dropdown.module.css'

Chart.register(LinearScale, LineElement, PointElement, Filler, Tooltip)
Chart.defaults.color = '#ccc'
Chart.defaults.font.family = 'system-ui'
const CHART_BG_COLOR = 'rgba(125, 125, 125, 0.35)'

type Point = { x: number, y: number }

type CoreWavelengths = Array<number>
type LibrarySpectra = StringMap<Array<Point>>

type SpectraPanelProps = {
    selectedSpectrum: Array<number> | null,
    spectrumPosition: [number, number]
}

const SpectraPanel = React.memo((
    { selectedSpectrum, spectrumPosition }: SpectraPanelProps
): ReactElement => {
    const [coreWavelengths, setCoreWavelengths] = useState<CoreWavelengths | null>(null)
    const [librarySpectra, setLibrarySpectra] = useState<LibrarySpectra | null>(null)
    const [libraryMineral, setLibraryMineral] = useState<string>('')

    const [mainPlotData, setMainPlotData] = useState<ChartData<'line'> | null>(null)
    const [deltaPlotData, setDeltaPlotData] = useState<ChartData<'line'> | null>(null)

    const [open, setOpen] = useState<boolean>(false)
    const render = useCollapseRender(open)

    // open spectra panel on spectrum change
    useEffect(() => {
        setOpen(selectedSpectrum === null || selectedSpectrum.length > 0)
    }, [selectedSpectrum])

    // get library spectra and wavelength values for selected spectra
    useEffect(() => {
        const getSpectraMetadata = async (): Promise<void> => {
            const [coreWavelengths, librarySpectra] = await Promise.all([
                fetchJson<CoreWavelengths>('./data-processed/temp/core-spectra-wavelengths.json'),
                fetchJson<LibrarySpectra>('./data-processed/temp/library-spectra.json')
            ])
            setCoreWavelengths(coreWavelengths)
            setLibrarySpectra(librarySpectra)

            const firstMineral = librarySpectra && Object.keys(librarySpectra)[0]
            if (firstMineral) {
                setLibraryMineral(firstMineral)
            }
        }
        getSpectraMetadata()
    }, [])

    // calculate chart data
    useEffect(() => {
        const librarySpectrum = librarySpectra?.[libraryMineral]
        if (!selectedSpectrum?.length || !librarySpectrum?.length || !coreWavelengths) {
            return
        }

        const selectedData = getSpectrumData(coreWavelengths, selectedSpectrum)
        const libraryData = getLibraryData(selectedData, librarySpectrum)
        setMainPlotData({
            datasets: [
                { data: selectedData, ...DATASET_OPTIONS.selected },
                { data: libraryData, ...DATASET_OPTIONS.library }
            ]
        })

        const deltaData = getDeltaData(selectedData, libraryData)
        // TODO: find a better way to plot dashed axis
        const deltaAxis: Array<Point> = [
            { x: deltaData[0].x, y: 0 },
            { x: deltaData[deltaData.length - 1].x, y: 0 }
        ]
        setDeltaPlotData({
            datasets: [
                { data: deltaData, ...DATASET_OPTIONS.delta },
                { data: deltaAxis, ...DATASET_OPTIONS.deltaAxis }
            ]
        })
    }, [selectedSpectrum, coreWavelengths, librarySpectra, libraryMineral])

    return (
        <div className={`${styles.spectraPanelWrap} ${open && styles.panelOpen}`}>
            { render && <div className={styles.spectraPanel}>
                <button
                    className={styles.collapseButton}
                    onClick={() => setOpen(false)}
                >
                    <PiCaretRightBold />
                </button>
                <div className={styles.positionLabel}>
                    <p className={styles.positionHeader}>
                        position
                    </p>
                    <p>
                        X <span>{spectrumPosition[0]}px</span>
                    </p>
                    <p>
                        Y <span>{spectrumPosition[1]}px</span>
                    </p>
                </div>
                { selectedSpectrum !== null && <>
                    <div className={styles.mainPlot}>
                        { mainPlotData && <Line
                            data={mainPlotData}
                            options={MAIN_PLOT_OPTIONS}
                            plugins={[chartBgColorPlugin]}
                        /> }
                    </div>
                    <div className={styles.librarySelect}>
                        <p className={styles.dropdownLabel}>
                            mineral profile
                        </p>
                        <Dropdown
                            items={Object.keys(librarySpectra || {})}
                            selected={`∆ ${libraryMineral}`}
                            setSelected={setLibraryMineral}
                            customStyles={spectraDropdownStyles}
                        />
                    </div>
                    <div className={styles.deltaPlot}>
                        { deltaPlotData && <Line
                            data={deltaPlotData}
                            options={DELTA_PLOT_OPTIONS}
                            plugins={[chartBgColorPlugin]}
                        /> }
                    </div>
                </> }
                { selectedSpectrum === null &&
                    <p className={styles.dataMissing}>
                        data missing
                    </p> }
            </div> }
        </div>
    )
})

function getSpectrumData (wavelengths: Array<number>, reflectances: Array<number>): Array<Point> {
    if (!wavelengths.length || !reflectances.length) {
        return []
    }

    const data: Array<Point> = []
    for (let i = 0; i < wavelengths.length; i++) {
        data.push({
            x: wavelengths[i],
            y: reflectances[i]
        })
    }

    return data
}

function getLibraryData (selected: Array<Point>, library: Array<Point>): Array<Point> {
    if (!selected.length || !library.length) {
        return []
    }

    // interpolate library spectra values share same wavelength (x) as selected spectrum
    const interpolated: Array<Point> = []
    let libInd = 1
    for (let i = 0; i < selected.length; i++) {
        // get wavelength to align to from selected spectra
        const wavelength = selected[i].x

        // increment index in original library data until
        // wavelength is between index and index - 1
        while (libInd + 1 < library.length && library[libInd].x < wavelength) {
            libInd++
        }

        // calculate how far curr wavelength is between library wavelengths
        const t = (wavelength - library[libInd - 1].x) / (library[libInd].x - library[libInd - 1].x)

        // interpolate library data to align with selected wavelength
        interpolated.push({
            x: wavelength,
            y: lerp(library[libInd - 1].y, library[libInd].y, t)
        })
    }

    // normalize reflectance values to align with selected spectrum
    let selectedAvg = 0
    for (let i = 0; i < selected.length; i++) {
        selectedAvg += selected[i].y
    }
    selectedAvg /= selected.length

    let libraryAvg = 0
    for (let i = 0; i < interpolated.length; i++) {
        libraryAvg += interpolated[i].y
    }
    libraryAvg /= interpolated.length

    const libraryScale = selectedAvg / libraryAvg

    const normalized = interpolated.map(point => {
        point.y *= libraryScale
        return point
    })

    return normalized
}

function getDeltaData (selected: Array<Point>, library: Array<Point>): Array<Point> {
    if (!selected.length || !library.length) {
        return []
    }

    const delta: Array<Point> = []
    for (let i = 0; i < selected.length; i++) {
        if (library[i].x !== selected[i].x) {
            throw new Error('Library and selected spectra wavelengths misaligned')
        }
        delta.push({
            x: selected[i].x,
            y: selected[i].y / library[i].y - 1.0
        })
    }
    return delta
}

const DATASET_OPTIONS = {
    selected: {
        borderColor: '#fff',
        borderWidth: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        fill: 'stack'
    },
    library: {
        borderColor: '#c4f571',
        backgroundColor: '#c4f571',
        borderWidth: 1,
        borderDash: [2, 2]
    },
    delta: {
        borderColor: '#fff',
        borderWidth: 2
    },
    deltaAxis: {
        borderColor: '#c4f571',
        backgroundColor: '#c4f571',
        borderWidth: 1,
        borderDash: [2, 2],
        pointHitRadius: 0
    }
}

const MAIN_PLOT_OPTIONS: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    elements: {
        point: {
            radius: 0,
            hoverRadius: 0,
            hitRadius: 30
        }
    },
    plugins: {
        tooltip: {
            mode: 'nearest',
            position: 'nearest',
            intersect: true,
            usePointStyle: true,
            cornerRadius: 3,
            boxPadding: 5,
            backgroundColor: 'rgba(50, 50, 50, 0.8)',
            padding: 5,
            titleFont: {
                size: 10,
                weight: 'normal'
            },
            bodyFont: {
                size: 10,
                weight: 'normal'
            },
            callbacks: {
                title: (items) => {
                    const wavelength = parseFloat(items[0].label.replace(',', '')).toFixed(1)
                    return `${wavelength} nm`
                }
            }

        }
    },
    scales: {
        x: {
            type: 'linear',
            bounds: 'data',
            border: {
                color: '#fff'
            },
            grid: {
                tickColor: '#ccc',
                drawOnChartArea: false
            },
            title: {
                display: true,
                text: 'WAVELENGTH (nm)',
                font: {
                    size: 14,
                    weight: 200
                },
                align: 'start'
            },
            ticks: {
                font: {
                    size: 8,
                    weight: 150
                },
                callback: excludeFirstLastTick,
                stepSize: 100,
                minRotation: 90,
                maxRotation: 90
            },
            min: 1000,
            max: 2600
        },
        y: {
            type: 'linear',
            bounds: 'ticks',
            border: {
                color: '#fff'
            },
            grid: {
                tickColor: '#ccc',
                drawOnChartArea: false
            },
            title: {
                display: true,
                text: 'REFLECTANCE',
                font: {
                    size: 12,
                    weight: 200
                }
            },
            ticks: {
                font: {
                    size: 8,
                    weight: 150
                },
                callback: (value, index, values) => {
                    const numberValue = typeof value === 'number' ? value : parseFloat(value)
                    const formatted = numberValue.toFixed(3)
                    return excludeFirstLastTick(formatted, index, values)
                }
            },
            beginAtZero: true
        }
    }
}

const DELTA_PLOT_OPTIONS: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        tooltip: {
            mode: 'nearest',
            position: 'nearest',
            intersect: true,
            backgroundColor: 'rgba(50, 50, 50, 0.8)',
            displayColors: false,
            padding: 5,
            titleFont: {
                size: 10,
                weight: 'normal'
            },
            bodyFont: {
                size: 10,
                weight: 'normal'
            },
            callbacks: {
                title: (items) => {
                    const wavelength = parseFloat(items[0].label.replace(',', '')).toFixed(1)
                    return `${wavelength} nm`
                },
                label: (item) => {
                    const deltaValue = parseFloat(item.formattedValue).toFixed(3)
                    return `${deltaValue} ∆`
                }
            }

        }
    },
    elements: {
        point: {
            radius: 0,
            hoverRadius: 0,
            hitRadius: 20
        }
    },
    scales: {
        x: {
            type: 'linear',
            bounds: 'data',
            border: {
                display: false
            },
            position: {
                y: 0
            },
            grid: {
                tickColor: '#ccc',
                tickLength: 20,
                color: 'transparent'
            },
            ticks: {
                font: {
                    size: 8,
                    weight: 150
                },
                callback: excludeFirstLastTick,
                stepSize: 100,
                minRotation: 90,
                maxRotation: 90,
                z: -1
            },
            min: 1000,
            max: 2600
        },
        y: {
            type: 'linear',
            bounds: 'ticks',
            min: -2,
            max: 2,
            title: {
                display: true,
                text: '∆ REFLECTANCE',
                padding: {
                    bottom: 15
                },
                font: {
                    size: 12,
                    weight: 200
                }
            },
            ticks: {
                display: true,
                font: {
                    size: 10,
                    weight: 150
                },
                minRotation: 90,
                maxRotation: 90,
                callback: (value, _index, _values) => {
                    if (value === '0' || value === 0) {
                        return '∆'
                    }
                    return undefined
                }
            },
            border: {
                display: false
            },
            grid: {
                display: false
            }
        }
    }
}

// custom plugin to fill chart background
const chartBgColorPlugin: Plugin = {
    id: 'chartBgColor',
    beforeDraw: function (chart, _args, _options) {
        const { ctx, chartArea } = chart
        const { left, top, width, height } = chartArea

        ctx.save()
        ctx.fillStyle = CHART_BG_COLOR
        ctx.fillRect(left, top, width, height)
        ctx.restore()
    }
}

// callback to exclude ticks at bounds of chart axis
function excludeFirstLastTick (
    value: string | number, index: number, values: Array<Tick>
): string | number | undefined {
    return (index === 0 || index === values.length - 1)
        ? undefined
        : value
}

export default SpectraPanel

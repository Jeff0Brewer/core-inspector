import {
    Chart, ChartData, ChartOptions,
    Plugin, Tooltip, Filler, Tick,
    LinearScale, LineElement, PointElement
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { ReactElement, useState, useEffect } from 'react'
import { PiCaretRightBold } from 'react-icons/pi'
import { StringMap, lerp } from '../../lib/util'
import Dropdown from '../../components/generic/dropdown'
import styles from '../../styles/part/spectra-panel.module.css'
import spectraDropdownStyles from '../../styles/custom/spectra-dropdown.module.css'

Chart.register(LinearScale, LineElement, PointElement, Filler, Tooltip)
Chart.defaults.color = '#ccc'
Chart.defaults.font.family = 'system-ui'
const CHART_BG_COLOR = 'rgba(125, 125, 125, 0.35)'

type Point = { x: number, y: number }

type SpectraPanelProps = {
    selectedSpectrum: Array<number>
}

function SpectraPanel (
    { selectedSpectrum }: SpectraPanelProps
): ReactElement {
    const [open, setOpen] = useState<boolean>(false)
    const [render, setRender] = useState<boolean>(false)

    const [coreWavelengths, setCoreWavelengths] = useState<Array<number>>([])
    const [librarySpectra, setLibrarySpectra] = useState<StringMap<Array<Point>>>({})
    const [libraryMineral, setLibraryMineral] = useState<string>('')

    const [mainPlotData, setMainPlotData] = useState<ChartData<'line'> | null>(null)
    const [deltaPlotData, setDeltaPlotData] = useState<ChartData<'line'> | null>(null)

    // open spectra panel on spectrum change
    useEffect(() => {
        setOpen(selectedSpectrum.length > 0)
    }, [selectedSpectrum])

    // toggle flag to render spectra panel, delay removal from
    // dom to allow collapse animation to finish
    useEffect(() => {
        if (open) {
            setRender(true)
        } else {
            // ensure timeout is longer than animation duration
            setTimeout(() => { setRender(false) }, 1000)
        }
    }, [open])

    // get library spectra and wavelength values for selected spectra
    useEffect(() => {
        const getSpectraMetadata = async (): Promise<void> => {
            const [coreWavelengths, librarySpectra] = await Promise.all([
                fetch('./data-processed/temp/core-spectra-wavelengths.json').then(res => res.json()),
                fetch('./data-processed/temp/library-spectra.json').then(res => res.json())
            ])
            setCoreWavelengths(coreWavelengths)
            setLibrarySpectra(librarySpectra)

            const firstMineral = Object.keys(librarySpectra)[0]
            if (firstMineral) {
                setLibraryMineral(firstMineral)
            }
        }
        getSpectraMetadata()
    }, [])

    // calculate chart data
    useEffect(() => {
        const librarySpectrum = librarySpectra[libraryMineral]
        if (!selectedSpectrum.length || !librarySpectrum?.length) {
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
                        items={Object.keys(librarySpectra)}
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
            </div> }
        </div>
    )
}

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
        // get curr wavelength to align to from selected spectra
        const wavelength = selected[i].x

        // increment index in original library data until
        // curr wavelength is between index and index - 1
        while (libInd + 1 < library.length && library[libInd].x < wavelength) {
            libInd++
        }

        // calculate how far curr wavelength is between library wavelengths
        const t = (wavelength - library[libInd - 1].x) / (library[libInd].x - library[libInd - 1].x)

        // interpolate library data to align with selected spectrum
        interpolated.push({
            x: wavelength,
            y: lerp(library[libInd - 1].y, library[libInd].y, t)
        })
    }

    // normalize reflectance values to align with selected spectra
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

// style for data represented in plots
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
        borderWidth: 1,
        borderDash: [2, 2]
    }
}

// custom plugin to fill chart background
const chartBgColorPlugin: Plugin = {
    id: 'chartBgColor',
    beforeDraw: (chart, _args, _options) => {
        const { ctx, chartArea } = chart
        const { left, top, width, height } = chartArea

        ctx.save()
        ctx.fillStyle = CHART_BG_COLOR
        ctx.fillRect(left, top, width, height)
        ctx.restore()
    }
}

function excludeFirstLastTick (
    value: string | number, index: number, values: Array<Tick>
): string | number | undefined {
    return (index === 0 || index === values.length - 1)
        ? undefined
        : value
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
            bodySpacing: 0,
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
            enabled: false
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

export default SpectraPanel

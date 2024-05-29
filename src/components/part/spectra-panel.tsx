import {
    Chart, ChartData, ChartOptions,
    Plugin, Tooltip, Filler, Tick,
    LinearScale, LineElement, PointElement,
    TooltipCallbacks
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import React, { ReactElement, useState, useEffect } from 'react'
import { PiCaretRightBold } from 'react-icons/pi'
import { StringMap, lerp, downloadText } from '../../lib/util'
import { fetchJson } from '../../lib/load'
import Dropdown from '../../components/generic/dropdown'
import DownloadIcon from '../../assets/download-icon.svg'
import { usePartIdContext } from '../../hooks/id-context'
import { useCollapseRender } from '../../hooks/collapse-render'
import styles from '../../styles/part/spectra-panel.module.css'
import spectraDropdownStyles from '../../styles/custom/spectra-dropdown.module.css'

Chart.register(LinearScale, LineElement, PointElement, Filler, Tooltip)
Chart.defaults.color = '#ccc'
Chart.defaults.font.family = 'system-ui'
const CHART_BG_COLOR = 'rgba(125, 125, 125, 0.35)'

const MINERAL_LIB_MAP: StringMap<string> = {
    amphibole: 'actinolite',
    chlorite: 'clinochlore',
    epidote: 'epidote',
    prehnite: 'prehnite',
    zeolite: 'laumontite',
    pyroxene: 'augite',
    carbonate: 'calcite',
    gypsum: 'gypsum',
    'kaolinite-montmorillinite': 'kaolinite'
}

type Point = { x: number, y: number }

type CoreWavelengths = Array<number>
type LibrarySpectra = StringMap<Array<Point>>

type SpectraPanelProps = {
    selectedSpectrum?: Array<number> | null,
    spectrumPosition?: [number, number],
    maxMineral?: string
}

const SpectraPanel = React.memo((
    { selectedSpectrum, spectrumPosition, maxMineral }: SpectraPanelProps
): ReactElement => {
    const [coreWavelengths, setCoreWavelengths] = useState<CoreWavelengths | null>(null)
    const [librarySpectra, setLibrarySpectra] = useState<LibrarySpectra | null>(null)
    const [libraryMineral, setLibraryMineral] = useState<string>('chlorite')

    const [selectedData, setSelectedData] = useState<Array<Point> | null>(null)
    const [mainPlotData, setMainPlotData] = useState<ChartData<'line'> | null>(null)
    const [deltaPlotData, setDeltaPlotData] = useState<ChartData<'line'> | null>(null)

    const [open, setOpen] = useState<boolean>(false)
    const render = useCollapseRender(open)
    const { part } = usePartIdContext()

    // Close panel on part change.
    useEffect(() => {
        setOpen(false)
    }, [part])

    // Open spectra panel on selected spectrum change.
    useEffect(() => {
        setOpen(!!selectedSpectrum?.length)
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
        }
        getSpectraMetadata()
    }, [])

    useEffect(() => {
        if (maxMineral && MINERAL_LIB_MAP[maxMineral]) {
            setLibraryMineral(MINERAL_LIB_MAP[maxMineral])
        }
    }, [maxMineral])

    // calculate chart data
    useEffect(() => {
        const librarySpectrum = librarySpectra?.[libraryMineral]
        if (!selectedSpectrum?.length || !librarySpectrum?.length || !coreWavelengths) {
            return
        }

        const selectedData = getSpectrumData(coreWavelengths, selectedSpectrum)
        const libraryData = getLibraryData(selectedData, librarySpectrum)
        setSelectedData(selectedData)
        setMainPlotData({
            datasets: [
                { data: selectedData, ...DATASET_OPTIONS.selected },
                { data: libraryData, ...DATASET_OPTIONS.library }
            ]
        })

        const deltaData = getDeltaData(selectedData, libraryData)
        // TODO: find a better way to plot dashed axis
        const deltaAxis: Array<Point> = [
            { x: deltaData[0].x, y: 1 },
            { x: deltaData[deltaData.length - 1].x, y: 1 }
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
                <div className={styles.topBar}>
                    <div className={styles.positionLabel}>
                        <p>X <span>{spectrumPosition?.[0] || 0}px</span></p>
                        <p>Y <span>{spectrumPosition?.[1] || 0}px</span></p>
                    </div>
                    <div className={styles.downloads}>
                        <button onClick={() => downloadCsv(selectedData)}>
                            <img src={DownloadIcon} />
                            <p>csv</p>
                        </button>
                    </div>
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
                            selected={libraryMineral}
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
            </div> }
        </div>
    )
})

function downloadCsv (spectrum: Array<Point> | null): void {
    if (!spectrum) { return }

    const csvList = ['wavelength,reflectance']
    for (const { x, y } of spectrum) {
        csvList.push(`${x},${y}`)
    }
    const csv = csvList.join('\n')
    downloadText('spectrum.csv', csv)
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

    // Interpolate library spectra values share same wavelength (x) as selected spectrum.
    const interpolated: Array<Point> = []
    let libInd = 1
    for (let i = 0; i < selected.length; i++) {
        // Get wavelength to align to from selected spectra.
        const wavelength = selected[i].x

        // Increment index in original library data until
        // wavelength is between index and index - 1.
        while (libInd + 1 < library.length && library[libInd].x < wavelength) {
            libInd++
        }

        // Calculate how far curr wavelength is between library wavelengths.
        const t = (wavelength - library[libInd - 1].x) / (library[libInd].x - library[libInd - 1].x)

        // Interpolate library data to align with selected wavelength.
        interpolated.push({
            x: wavelength,
            y: lerp(library[libInd - 1].y, library[libInd].y, t)
        })
    }

    // Normalize reflectance values to align with selected spectrum.
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
            y: selected[i].y / library[i].y
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

const TOOLTIP_OPTIONS = {
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
    // Bully the type since chart.js doesn't have optional properties in tooltip config.
    } as TooltipCallbacks<'line'>
} as const

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
    plugins: { tooltip: TOOLTIP_OPTIONS },
    scales: {
        x: {
            type: 'linear',
            bounds: 'data',
            border: { color: '#fff' },
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
            border: { color: '#fff' },
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
    plugins: { tooltip: TOOLTIP_OPTIONS },
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
            border: { display: false },
            position: { y: 1 },
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
            min: -1,
            max: 3,
            title: {
                display: true,
                text: ['REFLECTANCE', 'RATIO'],
                padding: { bottom: 17 },
                font: {
                    size: 12,
                    weight: 200
                }
            },
            ticks: { display: false },
            border: { display: false },
            grid: { display: false }
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

type SpectrumInfo = SpectraPanelProps
export type { SpectrumInfo }
export default SpectraPanel

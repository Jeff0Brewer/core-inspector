import { ReactElement, useState, useEffect } from 'react'
import { PiCaretRightBold } from 'react-icons/pi'
import { Chart, LinearScale, LineElement, PointElement, Filler, Tooltip, ChartOptions, Plugin, Tick } from 'chart.js'
import { Line } from 'react-chartjs-2'
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
    spectrum: Array<number>
}

function SpectraPanel (
    { spectrum }: SpectraPanelProps
): ReactElement {
    const [open, setOpen] = useState<boolean>(false)
    const [spectrumData, setSpectrumData] = useState<Array<Point>>([])
    const [libraryData, setLibraryData] = useState<Array<Point>>([])
    const [deltaData, setDeltaData] = useState<Array<Point>>([])

    const [librarySpectra, setLibrarySpectra] = useState<StringMap<Array<Point>>>({})
    const [libraryMineral, setLibraryMineral] = useState<string>('')

    useEffect(() => {
        const getLibrarySpectra = async (): Promise<void> => {
            const res = await fetch('./data-processed/temp/library-spectra.json')
            const librarySpectra = await res.json()
            setLibrarySpectra(librarySpectra)

            const firstMineral = Object.keys(librarySpectra)[0]
            if (firstMineral) {
                setLibraryMineral(firstMineral)
            }
        }
        getLibrarySpectra()
    }, [])

    useEffect(() => {
        const spectrumData = getSpectrumData(CORE_WAVELENGTHS, spectrum)
        setSpectrumData(spectrumData)

        setOpen(spectrum.length > 0)
    }, [spectrum])

    useEffect(() => {
        if (!librarySpectra[libraryMineral]) { return }

        const libraryData = getLibraryData(spectrumData, librarySpectra[libraryMineral])
        setLibraryData(libraryData)
    }, [spectrumData, librarySpectra, libraryMineral])

    useEffect(() => {
        const deltaData = getDeltaData(spectrumData, libraryData)
        setDeltaData(deltaData)
    }, [spectrumData, libraryData])

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
                                data: spectrumData,
                                ...DATASET_OPTIONS.selected
                            }, {
                                data: libraryData,
                                ...DATASET_OPTIONS.library
                            }]
                        }}
                        options={MAIN_PLOT_OPTIONS}
                        plugins={[chartBgColorPlugin]}
                    />
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
                    <Line
                        data={{
                            datasets: [{
                                data: deltaData,
                                ...DATASET_OPTIONS.delta
                            }, {
                                /* TODO: find a better way to plot dashed axis */
                                data: deltaData.map(({ x }) => ({ x, y: 0 })),
                                ...DATASET_OPTIONS.deltaAxis
                            }]
                        }}
                        options={DELTA_PLOT_OPTIONS}
                        plugins={[chartBgColorPlugin]}
                    />
                </div>
            </div>
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

function getLibraryData (spectrum: Array<Point>, library: Array<Point>): Array<Point> {
    if (!spectrum.length || !library.length) {
        return []
    }

    // interpolate library spectra values share same wavelength (x) as selected spectrum
    const interpolated: Array<Point> = []
    let libInd = 1
    for (let i = 0; i < spectrum.length; i++) {
        // get curr wavelength to align to from selected spectra
        const wavelength = spectrum[i].x

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
    let spectrumAvg = 0
    for (let i = 0; i < spectrum.length; i++) {
        spectrumAvg += spectrum[i].y
    }
    spectrumAvg /= spectrum.length

    let libraryAvg = 0
    for (let i = 0; i < interpolated.length; i++) {
        libraryAvg += interpolated[i].y
    }
    libraryAvg /= interpolated.length

    const libraryScale = spectrumAvg / libraryAvg

    const normalized = interpolated.map(point => {
        point.y *= libraryScale
        return point
    })

    return normalized
}

function getDeltaData (spectrum: Array<Point>, library: Array<Point>): Array<Point> {
    if (!spectrum.length || !library.length) {
        return []
    }

    const delta: Array<Point> = []
    for (let i = 0; i < spectrum.length; i++) {
        if (library[i].x !== spectrum[i].x) {
            throw new Error('Library and selected spectra wavelengths misaligned')
        }
        delta.push({
            x: spectrum[i].x,
            y: spectrum[i].y / library[i].y - 1.0
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
            hoverRadius: 0
        }
    },
    plugins: {
        tooltip: {
            mode: 'x',
            position: 'nearest',
            intersect: false
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
                text: 'WAVELENGTH',
                font: {
                    size: 14,
                    weight: 200
                },
                align: 'start'
            },
            ticks: {
                font: {
                    size: 8,
                    weight: 100
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
                text: 'REFLECTANCE',
                font: {
                    size: 12,
                    weight: 200
                }
            },
            ticks: {
                font: {
                    size: 8,
                    weight: 100
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
    elements: {
        point: {
            radius: 0,
            hoverRadius: 0
        }
    },
    layout: {
        padding: {
            left: 10
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
                    weight: 100
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
            bounds: 'data',
            min: -2,
            max: 2,
            title: {
                display: true,
                text: '∆ REFLECTANCE',
                font: {
                    size: 12,
                    weight: 200
                }
            },
            ticks: {
                display: true,
                font: {
                    size: 10,
                    weight: 100
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

// TODO: replace with file
const CORE_WAVELENGTHS = [
    898.216003, 904.224976, 910.234009, 916.242981, 922.252014, 928.260986,
    934.270020, 940.278992, 946.288025, 952.296997, 958.306030, 964.315002,
    970.323975, 976.333008, 982.341980, 988.351013, 994.359985, 1000.369995,
    1006.380005, 1012.390015, 1018.400024, 1024.400024, 1030.410034, 1036.420044,
    1042.430054, 1048.439941, 1054.449951, 1060.459961, 1066.469971, 1072.479980,
    1078.489990, 1084.489990, 1090.500000, 1096.510010, 1102.520020, 1108.530029,
    1114.540039, 1120.550049, 1126.560059, 1132.569946, 1138.579956, 1144.579956,
    1150.589966, 1156.599976, 1162.609985, 1168.619995, 1174.630005, 1180.640015,
    1186.650024, 1192.660034, 1198.670044, 1204.670044, 1210.680054, 1216.689941,
    1222.699951, 1228.709961, 1234.719971, 1240.729980, 1246.739990, 1252.750000,
    1258.760010, 1264.760010, 1270.770020, 1276.780029, 1282.790039, 1288.800049,
    1294.810059, 1300.819946, 1306.829956, 1312.839966, 1318.839966, 1324.849976,
    1330.859985, 1336.869995, 1342.880005, 1348.890015, 1354.900024, 1360.910034,
    1366.920044, 1372.930054, 1378.930054, 1384.939941, 1390.949951, 1396.959961,
    1402.969971, 1408.979980, 1414.989990, 1421.000000, 1427.010010, 1433.020020,
    1439.020020, 1445.030029, 1451.040039, 1457.050049, 1463.060059, 1469.069946,
    1475.079956, 1481.089966, 1487.099976, 1493.109985, 1499.109985, 1505.119995,
    1511.130005, 1517.140015, 1523.150024, 1529.160034, 1535.170044, 1541.180054,
    1547.189941, 1553.199951, 1559.199951, 1565.209961, 1571.219971, 1577.229980,
    1583.239990, 1589.250000, 1595.260010, 1601.270020, 1607.280029, 1613.290039,
    1619.290039, 1625.300049, 1631.310059, 1637.319946, 1643.329956, 1649.339966,
    1655.349976, 1661.359985, 1667.369995, 1673.369995, 1679.380005, 1685.390015,
    1691.400024, 1697.410034, 1703.420044, 1709.430054, 1715.439941, 1721.449951,
    1727.459961, 1733.459961, 1739.469971, 1745.479980, 1751.489990, 1757.500000,
    1763.510010, 1769.520020, 1775.530029, 1781.540039, 1787.550049, 1793.550049,
    1799.560059, 1805.569946, 1811.579956, 1817.589966, 1823.599976, 1829.609985,
    1835.619995, 1841.630005, 1847.640015, 1853.640015, 1859.650024, 1865.660034,
    1871.670044, 1877.680054, 1883.689941, 1889.699951, 1895.709961, 1901.719971,
    1907.729980, 1913.729980, 1919.739990, 1925.750000, 1931.760010, 1937.770020,
    1943.780029, 1949.790039, 1955.800049, 1961.810059, 1967.819946, 1973.819946,
    1979.829956, 1985.839966, 1991.849976, 1997.859985, 2003.869995, 2009.880005,
    2015.890015, 2021.900024, 2027.900024, 2033.910034, 2039.920044, 2045.930054,
    2051.939941, 2057.949951, 2063.959961, 2069.969971, 2075.979980, 2081.989990,
    2087.989990, 2094.000000, 2100.010010, 2106.020020, 2112.030029, 2118.040039,
    2124.050049, 2130.060059, 2136.070068, 2142.080078, 2148.080078, 2154.090088,
    2160.100098, 2166.110107, 2172.120117, 2178.129883, 2184.139893, 2190.149902,
    2196.159912, 2202.169922, 2208.169922, 2214.179932, 2220.189941, 2226.199951,
    2232.209961, 2238.219971, 2244.229980, 2250.239990, 2256.250000, 2262.260010,
    2268.260010, 2274.270020, 2280.280029, 2286.290039, 2292.300049, 2298.310059,
    2304.320068, 2310.330078, 2316.340088, 2322.350098, 2328.350098, 2334.360107,
    2340.370117, 2346.379883, 2352.389893, 2358.399902, 2364.409912, 2370.419922,
    2376.429932, 2382.429932, 2388.439941, 2394.449951, 2400.459961, 2406.469971,
    2412.479980, 2418.489990, 2424.500000, 2430.510010, 2436.520020, 2442.520020,
    2448.530029, 2454.540039, 2460.550049, 2466.560059, 2472.570068, 2478.580078,
    2484.590088, 2490.600098, 2496.610107, 2502.610107, 2508.620117, 2514.629883,
    2520.639893, 2526.649902, 2532.659912, 2538.669922, 2544.679932, 2550.689941,
    2556.699951, 2562.699951, 2568.709961, 2574.719971, 2580.729980, 2586.739990,
    2592.750000, 2598.760010, 2604.770020
]

export default SpectraPanel

import { ReactElement, useState, useEffect } from 'react'
import { PiCaretRightBold } from 'react-icons/pi'
import Dropdown from '../../components/generic/dropdown'
import SvgPlot from '../../components/generic/svg-plot'
import { StringMap } from '../../lib/util'
import styles from '../../styles/part/spectra-panel.module.css'
import spectraDropdownStyles from '../../styles/custom/spectra-dropdown.module.css'

type SpectraPanelProps = {
    spectra: Array<number>
}

function SpectraPanel (
    { spectra }: SpectraPanelProps
): ReactElement {
    const [open, setOpen] = useState<boolean>(false)
    const [librarySpectra, setLibrarySpectra] = useState<StringMap<Array<number>>>({})
    const [libraryMineral, setLibraryMineral] = useState<string>('')

    useEffect(() => {
        const getLibrarySpectra = async (): Promise<void> => {
            // TODO: remove static path
            const res = await fetch('./data-processed/temp/library-spectra.json')
            const data = await res.json()
            setLibrarySpectra(data)
            setLibraryMineral(Object.keys(data)[0])
        }
        getLibrarySpectra()
    }, [])

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
                <div className={styles.plots}>
                    { spectra !== null && <>
                        <SvgPlot
                            customClass={styles.mainPlot}
                            elements={[
                                {
                                    data: spectra,
                                    fillOpacity: '0.3',
                                    strokeWidth: '2'
                                }, {
                                    data: libraryMineral ? librarySpectra[libraryMineral].map(x => x * 255) : [],
                                    fill: 'transparent',
                                    stroke: '#B9E66C',
                                    strokeWidth: '1',
                                    strokeDash: '2'
                                }
                            ]}
                            labelX={'wavelength'}
                            labelY={'reflectance'}
                            ticksX={{
                                min: 1000,
                                max: 2500,
                                step: 100
                            }}
                            ticksY={{
                                min: 0.125,
                                max: 0.875,
                                step: 0.125
                            }}
                        />

                    </>}
                </div>
                <div className={styles.mineralSelect}>
                    <p className={styles.dropdownLabel}>
                        mineral profile
                    </p>
                    <Dropdown
                        items={Object.keys(librarySpectra)}
                        selected={libraryMineral}
                        setSelected={setLibraryMineral}
                        customStyles={spectraDropdownStyles}
                    />
                </div>
            </div>
        </div>
    )
}

export default SpectraPanel

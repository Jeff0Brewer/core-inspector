import { ReactElement, useState, useEffect } from 'react'
import { PiCaretRightBold } from 'react-icons/pi'
import Dropdown from '../../components/generic/dropdown'
import SvgPlot from '../../components/generic/svg-plot'
import { StringMap } from '../../lib/util'
import styles from '../../styles/part/spectra-panel.module.css'
import spectraDropdownStyles from '../../styles/custom/spectra-dropdown.module.css'

type LibrarySpectra = StringMap<{
    wavelength: Array<number>,
    reflectance: Array<number>
}>

type SpectraPanelProps = {
    spectra: Array<number>
}

function SpectraPanel (
    { spectra }: SpectraPanelProps
): ReactElement {
    const [open, setOpen] = useState<boolean>(false)
    const [libraryMineral, setLibraryMineral] = useState<string>('')

    const [librarySpectra, setLibrarySpectra] = useState<LibrarySpectra>({})
    const [coreWavelengths, setCoreWavelengths] = useState<Array<number>>([])

    useEffect(() => {
        const getSpectraMetadata = async (): Promise<void> => {
            // TODO: remove static paths
            const [librarySpectra, coreWavelengths] = await Promise.all([
                fetch('./data-processed/temp/library-spectra.json').then(res => res.json()),
                fetch('./data-processed/temp/core-spectra-wavelengths.json').then(res => res.json())
            ])
            setLibrarySpectra(librarySpectra)
            setLibraryMineral(Object.keys(librarySpectra)[0])
            setCoreWavelengths(coreWavelengths)
        }
        getSpectraMetadata()
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
                                    x: coreWavelengths,
                                    y: spectra,
                                    fillOpacity: '0.3',
                                    strokeWidth: '2'
                                }, {
                                    x: librarySpectra[libraryMineral]?.wavelength || [],
                                    y: librarySpectra[libraryMineral]?.reflectance || [],
                                    fill: 'transparent',
                                    stroke: '#B9E66C',
                                    strokeWidth: '1',
                                    strokeDash: '2'
                                }
                            ]}
                            axisX={{
                                bounds: [1, 2.5],
                                label: 'wavelength',
                                tickStep: 0.1
                            }}
                            axisY={{
                                bounds: [0, 1],
                                label: 'reflectance',
                                tickStep: 0.125
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

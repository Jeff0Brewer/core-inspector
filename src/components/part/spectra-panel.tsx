import { ReactElement, useState, useEffect } from 'react'
import { PiCaretRightBold } from 'react-icons/pi'
import SvgPlot from '../../components/generic/svg-plot'
import styles from '../../styles/part/spectra-panel.module.css'

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
                <div className={styles.plots}>
                    { spectra !== null && <>
                        <SvgPlot
                            customClass={styles.mainPlot}
                            elements={[
                                {
                                    data: spectra,
                                    fillOpacity: '0.3',
                                    strokeWidth: '2'
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
            </div>
        </div>
    )
}

export default SpectraPanel

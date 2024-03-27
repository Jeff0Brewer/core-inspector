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
                    />

                </>}
            </div>
        </div>
    )
}

export default SpectraPanel

import { ReactElement } from 'react'
import SvgPlot from '../../components/generic/svg-plot'
import styles from '../../styles/part/spectra-panel.module.css'

type SpectraPanelProps = {
    spectra: Array<number> | null
}

function SpectraPanel (
    { spectra }: SpectraPanelProps
): ReactElement {
    return <>
        <div className={styles.spectraLabel}></div>
        <div className={styles.spectraPanel}>
            { spectra !== null && <>
                <div className={styles.mainPlot}>
                    <SvgPlot data={spectra} />
                </div>

            </>}
        </div>
    </>
}

export default SpectraPanel

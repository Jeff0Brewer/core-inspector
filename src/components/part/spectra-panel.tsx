import { ReactElement } from 'react'
import styles from '../../styles/part/spectra-panel.module.css'

type SpectraPanelProps = {
    spectra: Array<number> | null
}

function SpectraPanel (
    { spectra }: SpectraPanelProps
): ReactElement {
    return <>
        <div className={styles.spectraLabel}>
        </div>
        <div className={styles.spectraPanel}>
        </div>
    </>
}

export default SpectraPanel

import { ReactElement } from 'react'
import DownloadIcon from '../../assets/download-icon.svg'
import styles from '../../styles/generic/download-link.module.css'

function DownloadLink (): ReactElement {
    return (
        <a
            className={styles.download}
            href={'https://coreinspector.caltech.edu/DOWNLOAD.html'}
            target={'_blank'}
        >
            <img src={DownloadIcon} style={{ height: '16px' }} />
        </a>
    )
}

export default DownloadLink

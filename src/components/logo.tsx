import { ReactElement } from 'react'
import CoreinspectorLogoText from '../assets/coreinspector-logotype.svg'
import BugIcon from '../assets/bug-icon.svg'
import styles from '../styles/logo.module.css'

function Logo (): ReactElement {
    return (

        <div className={styles.title}>
            <a className={styles.bugIcon} target={'_blank'} href={'https://bit.ly/COREINSPECTOR-BUGS'}>
                <img src={BugIcon} />
            </a>
            <a className={styles.logo} href={'https://coreinspector.caltech.edu/HOME.html'}>
                <img src={CoreinspectorLogoText} />
            </a>
        </div>
    )
}

export default Logo

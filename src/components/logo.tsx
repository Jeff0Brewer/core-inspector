import { ReactElement } from 'react'
import BugSvg from '../assets/bug-icon.svg'
import styles from '../styles/logo.module.css'

function Logo (): ReactElement {
    return (

        <div className={styles.title}>
            <a className={styles.bugIcon} href={'https://bit.ly/COREINSPECTOR-BUGS'}>
                <img src={BugSvg} />
            </a>
            <a className={styles.logo} href={'https://coreinspector.caltech.edu/HOME.html'}>
                <p>coreinspector</p>
            </a>
        </div>
    )
}

export default Logo

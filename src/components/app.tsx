import { ReactElement } from 'react'
import { useIdContext } from '../hooks/id-context'
import CoreView from '../components/core/layout'
import PartView from '../components/part/layout'
import styles from '../styles/app.module.css'

function App (): ReactElement {
    const { part } = useIdContext()

    return (
        <main className={styles.app}>
            { part === null &&
                <CoreView /> }
            { part !== null &&
                <PartView /> }
        </main>
    )
}

export default App

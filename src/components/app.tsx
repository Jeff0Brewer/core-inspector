import { ReactElement } from 'react'
import { useIdContext } from '../hooks/id-context'
import CoreParamsProvider from '../components/core-params-provider'
import CoreView from '../components/core/layout'
import PartView from '../components/part/layout'
import styles from '../styles/app.module.css'

function App (): ReactElement {
    const { part } = useIdContext()

    return (
        <main className={styles.app}>
            <CoreParamsProvider>
                { part === null &&
                    <CoreView /> }
            </CoreParamsProvider>
            { part !== null &&
                <PartView /> }
        </main>
    )
}

export default App

import { ReactElement } from 'react'
import { useIdContext } from '../hooks/id-context'
import { useCollapseRender } from '../hooks/collapse-render'
import CoreParamsProvider from '../components/core-params-provider'
import CoreView from '../components/core/layout'
import PartView from '../components/part/layout'
import styles from '../styles/app.module.css'

function App (): ReactElement {
    const { part } = useIdContext()
    const currView = part === null ? 'core' : 'part'
    const renderCore = useCollapseRender(currView === 'core')
    const renderPart = useCollapseRender(currView === 'part')

    return (
        <main className={styles.app} data-view={currView}>
            <div className={styles.coreWrap}>
                <CoreParamsProvider>
                    { renderCore && <CoreView /> }
                </CoreParamsProvider>
            </div>
            <div className={styles.partWrap}>
                { renderPart && <PartView /> }
            </div>
        </main>
    )
}

export default App

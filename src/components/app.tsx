import { useState, ReactElement } from 'react'
import BlendProvider from '../components/blend-provider'
import CoreMetadataProvider from '../components/core-metadata-provider'
import CoreView from '../components/core/layout'
import PartView from '../components/part/layout'
import styles from '../styles/app.module.css'

const CORES = ['gt1', 'gt2', 'gt3']
const MINERALS = [
    'chlorite',
    'epidote',
    'prehnite',
    'zeolite',
    'amphibole',
    'pyroxene',
    'gypsum',
    'carbonate',
    'kaolinite-montmorillinite'
]

function App (): ReactElement {
    const [core, setCore] = useState<string>(CORES[0])
    const [part, setPart] = useState<string | null>(null)

    return (
        <main className={styles.app}>
            <CoreMetadataProvider core={core}>
                <BlendProvider minerals={MINERALS}>
                    { part === null &&
                        <CoreView
                            cores={CORES}
                            minerals={MINERALS}
                            core={core}
                            setCore={setCore}
                            setPart={setPart}
                        />
                    }
                    { part !== null &&
                        <PartView
                            part={part}
                            core={core}
                            minerals={MINERALS}
                            setPart={setPart}
                        />
                    }
                </BlendProvider>
            </CoreMetadataProvider>
        </main>
    )
}

export default App

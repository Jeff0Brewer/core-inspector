import { useState, useEffect, ReactElement } from 'react'
import { COLOR_PRESETS } from '../lib/palettes'
import BlendProvider from '../components/blend-provider'
import CoreMetadataProvider from '../components/core-metadata-provider'
import CoreView from '../components/core/core-view'
import PartView from '../components/part/part-view'
import '../styles/app.css'

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
        <main className={'app'}>
            <CoreMetadataProvider core={core}>
                <BlendProvider minerals={MINERALS} palettes={COLOR_PRESETS}>
                    { part === null &&
                        <CoreView
                            cores={CORES}
                            minerals={MINERALS}
                            palettes={COLOR_PRESETS}
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
                            palettes={COLOR_PRESETS}
                            setPart={setPart}
                        />
                    }
                </BlendProvider>
            </CoreMetadataProvider>
        </main>
    )
}

export default App

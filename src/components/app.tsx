import { useState, ReactElement } from 'react'
import { COLOR_PRESETS } from '../lib/palettes'
import BlendProvider from '../components/blend-provider'
import FullCore from '../components/full-core'
import SinglePart from '../components/single-part'
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
        <main>
            <BlendProvider minerals={MINERALS} palettes={COLOR_PRESETS}>
                { part === null && <div className={'full-view-wrap'}>
                    <FullCore
                        cores={CORES}
                        minerals={MINERALS}
                        palettes={COLOR_PRESETS}
                        core={core}
                        setCore={setCore}
                        setPart={setPart}
                    />
                </div> }
                { part !== null && <div className={'single-view-wrap'}>
                    <SinglePart
                        part={part}
                        core={core}
                        minerals={MINERALS}
                        palettes={COLOR_PRESETS}
                        clearPart={() => setPart(null)}
                    />
                </div> }
            </BlendProvider>
        </main>
    )
}

export default App

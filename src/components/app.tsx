import { useState, ReactElement } from 'react'
import { COLOR_PRESETS } from '../lib/palettes'
import FullCore from '../components/full-core'

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
            { !part && <FullCore
                cores={CORES}
                minerals={MINERALS}
                palettes={COLOR_PRESETS}
                core={core}
                setCore={setCore}
                setPart={setPart}
            /> }
        </main>
    )
}

export default App

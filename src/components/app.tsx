import { useState, ReactElement } from 'react'
import { COLOR_PRESETS } from '../lib/palettes'
import FullCore from '../components/full-core'
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

    return (
        <main>
            <FullCore
                cores={CORES}
                minerals={MINERALS}
                palettes={COLOR_PRESETS}
                core={core}
                setCore={setCore}
            />
        </main>
    )
}

export default App

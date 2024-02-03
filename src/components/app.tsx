import { useState, useEffect, ReactElement } from 'react'
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

type ViewMode = 'full' | 'single'

function App (): ReactElement {
    const [core, setCore] = useState<string>(CORES[0])
    const [part, setPart] = useState<string | null>(null)
    const [mode, setMode] = useState<ViewMode>('full')
    const [transitioning, setTransitioning] = useState<boolean>(false)

    useEffect(() => {
        if (!transitioning) {
            setTransitioning(true)
            window.setTimeout(() => setTransitioning(false), 1000)
            return
        }

        setMode(part !== null ? 'single' : 'full')
    }, [part, transitioning])

    return (
        <main>
            { (mode === 'full' || transitioning) && <section
                className={'full-view'}
                data-visible={mode === 'full'}
            >
                <FullCore
                    cores={CORES}
                    minerals={MINERALS}
                    palettes={COLOR_PRESETS}
                    core={core}
                    setCore={setCore}
                    setPart={setPart}
                />
            </section> }
            { (mode === 'single' || transitioning) && <section
                className={'single-view'}
                data-visible={mode === 'single'}
            >
                <p> single view </p>
            </section> }
        </main>
    )
}

export default App

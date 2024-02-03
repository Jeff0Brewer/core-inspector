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
const MODE_SWITCH_MS = 500
const MODE_SWITCH_TRANSITION = `opacity ${MODE_SWITCH_MS}ms ease`

type ViewMode = 'full' | 'single'

function App (): ReactElement {
    const [core, setCore] = useState<string>(CORES[0])
    const [part, setPart] = useState<string | null>(null)
    const [mode, setMode] = useState<ViewMode>('full')
    const [render, setRender] = useState<ViewMode | 'both'>(mode)

    useEffect(() => {
        setRender('both')
        if (part) {
            setMode('single')
            window.setTimeout(() => setRender('single'), MODE_SWITCH_MS)
        } else {
            setMode('full')
            window.setTimeout(() => setRender('full'), MODE_SWITCH_MS)
        }
    }, [part])

    return (
        <main>
            <section
                className={'full-view'}
                style={{
                    transition: MODE_SWITCH_TRANSITION,
                    opacity: mode === 'full' ? 1 : 0
                }}
            >
                { render !== 'single' && <FullCore
                    cores={CORES}
                    minerals={MINERALS}
                    palettes={COLOR_PRESETS}
                    core={core}
                    setCore={setCore}
                    setPart={setPart}
                /> }
            </section>
            <section
                className={'single-view'}
                style={{
                    transition: MODE_SWITCH_TRANSITION,
                    opacity: mode === 'single' ? 1 : 0
                }}
            >
                { render !== 'full' && <p>
                    single view
                </p> }
            </section>
        </main>
    )
}

export default App

import { useState, ReactElement } from 'react'
import { COLOR_PRESETS } from '../lib/palettes'
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

type ViewMode = 'single' | 'full'

function App (): ReactElement {
    const [mode, setMode] = useState<ViewMode>('full')
    const [core, setCore] = useState<string>(CORES[0])
    const [part, setPart] = useState<string | null>(null)
    const [transitioning, setTransitioning] = useState<boolean>(false)

    const startTransition = (): void => {
        setTransitioning(true)
        window.setTimeout(() => setTransitioning(false), 1000)
    }

    const viewSinglePart = (part: string): void => {
        setPart(part)
        startTransition()
        window.setTimeout(() => setMode('single'), 50)
    }

    const viewFullCore = (): void => {
        setPart(null)
        startTransition()
        window.setTimeout(() => setMode('full'), 50)
    }

    return (
        <main>
            { (mode === 'full' || transitioning) && <div
                className={'full-view-wrap'}
                data-visible={mode === 'full'}
            >
                <FullCore
                    cores={CORES}
                    minerals={MINERALS}
                    palettes={COLOR_PRESETS}
                    core={core}
                    setCore={setCore}
                    setPart={viewSinglePart}
                />
            </div> }
            { (mode === 'single' || transitioning) && <div
                className={'single-view-wrap'}
                data-visible={mode === 'single'}
            >
                <SinglePart
                    part={part}
                    core={core}
                    minerals={MINERALS}
                    palettes={COLOR_PRESETS}
                    clearPart={viewFullCore}
                />
            </div> }
        </main>
    )
}

export default App

import { useState, ReactElement, ReactNode } from 'react'
import IdContext from '../hooks/id-context'

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

type IdProviderProps = {
    children: ReactNode
}

function IdProvider (
    { children }: IdProviderProps
): ReactElement {
    const [core, setCore] = useState<string>(CORES[0])
    const [part, setPart] = useState<string | null>(null)

    return (
        <IdContext.Provider value={{
            core,
            setCore,
            part,
            setPart,
            cores: CORES,
            minerals: MINERALS
        }}>
            {children}
        </IdContext.Provider>
    )
}

export default IdProvider

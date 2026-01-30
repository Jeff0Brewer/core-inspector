import { useState, ReactElement, ReactNode } from 'react'
import IdContext from '../hooks/id-context'

const CORES = [
    'BA1A',
    'BA3A',
    'BA4A'
]

const MINERALS = [
    'fe_oxides',
    'brucite',
    'chlorite',
    'epidote',
    'hcp',
    'hydroandradite_hydrogrossular',
    'lcp',
    'serpentine',
    'xonotlite'
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

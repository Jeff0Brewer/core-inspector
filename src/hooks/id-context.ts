import { createContext, useContext } from 'react'

type IdContextProps<PartType> = {
    core: string,
    setCore: (c: string) => void,
    part: PartType,
    setPart: (p: string | null) => void,
    cores: Array<string>,
    minerals: Array<string>
}

const IdContext = createContext<IdContextProps<string | null> | null>(null)

const useIdContext = (): IdContextProps<string | null> => {
    const context = useContext(IdContext)
    if (context === null) {
        throw new Error('useIdContext must be called from a child of IdProvider')
    }
    return context
}

const usePartIdContext = (): IdContextProps<string> => {
    const context = useIdContext()
    if (context.part === null) {
        throw new Error('No part selected for part view')
    }
    return context as IdContextProps<string>
}

export default IdContext
export {
    useIdContext,
    usePartIdContext
}

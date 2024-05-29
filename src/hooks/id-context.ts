import { createContext, useContext, useRef } from 'react'

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
    const context = useContext(IdContext)
    const validPartRef = useRef<string | null>(null)

    if (context === null) {
        throw new Error('usePartIdContext must be called from a child of IdProvider')
    }

    const part = context.part || validPartRef.current
    validPartRef.current = part
    if (part === null) {
        throw new Error('usePartIdContext must be called after a part has been selected')
    }

    const partContext = { ...context }
    partContext.part = part

    return partContext as IdContextProps<string>
}

export default IdContext
export {
    useIdContext,
    usePartIdContext
}

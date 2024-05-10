import { useState, useLayoutEffect, useRef } from 'react'

function useLastState<T> (value: T): T | null {
    const valueRef = useRef<T | null>(null)
    const [lastValue, setLastValue] = useState<T | null>(null)

    useLayoutEffect(() => {
        if (valueRef.current !== value) {
            setLastValue(valueRef.current)
            valueRef.current = value
        }
    }, [value])

    return lastValue
}

export { useLastState }

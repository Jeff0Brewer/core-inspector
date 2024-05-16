import { useState, useEffect, useLayoutEffect } from 'react'

type TransitionBoundsValue = {
    min: number | null,
    max: number | null,
    transitioning: boolean
}

function useTransitionBounds (
    min: number,
    max: number,
    timeoutMs: number = 1200
): TransitionBoundsValue {
    const [currMin, setCurrMin] = useState<number | null>(null)
    const [currMax, setCurrMax] = useState<number | null>(null)
    const [transitioning, setTransitioning] = useState<boolean>(false)

    useEffect(() => {
        if (currMin !== null) {
            setCurrMin(Math.min(min, currMin))
        } else {
            setCurrMin(min)
        }
    }, [min, currMin])

    useEffect(() => {
        if (currMax !== null) {
            setCurrMax(Math.max(max, currMax))
        } else {
            setCurrMax(max)
        }
    }, [max, currMax])

    useLayoutEffect(() => {
        setTransitioning(true)
        const timeoutId = window.setTimeout(
            () => {
                setCurrMin(min)
                setCurrMax(max)
                setTransitioning(false)
            },
            timeoutMs
        )
        return () => {
            window.clearTimeout(timeoutId)
        }
    }, [min, max, timeoutMs])

    return {
        min: currMin,
        max: currMax,
        transitioning
    }
}

export { useTransitionBounds }

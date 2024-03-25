import { useState, ReactElement, ReactNode } from 'react'
import { StringMap } from '../lib/util'
import { GenericPalette } from '../lib/palettes'
import { BlendMode } from '../vis/mineral-blend'
import BlendContext from '../hooks/blend-context'

type BlendProviderProps = {
    minerals: Array<string>,
    palettes: Array<GenericPalette>,
    children: ReactNode
}

function BlendProvider (
    { minerals, palettes, children }: BlendProviderProps
): ReactElement {
    const [magnitudes, setMagnitudes] = useState<StringMap<number>>(
        Object.fromEntries(minerals.map(mineral => [mineral, 1]))
    )
    const [visibilities, setVisibilities] = useState<StringMap<boolean>>(
        Object.fromEntries(minerals.map(mineral => [mineral, true]))
    )
    const [palette, setPalette] = useState<GenericPalette>(palettes[0])
    const [saturation, setSaturation] = useState<number>(1)
    const [threshold, setThreshold] = useState<number>(0)
    const [mode, setMode] = useState<BlendMode>('additive')
    const [monochrome, setMonochrome] = useState<boolean>(false)

    const value = {
        palette,
        setPalette,
        magnitudes,
        setMagnitudes,
        visibilities,
        setVisibilities,
        saturation,
        setSaturation,
        threshold,
        setThreshold,
        mode,
        setMode,
        monochrome,
        setMonochrome
    }

    return (
        <BlendContext.Provider value={value}>
            {children}
        </BlendContext.Provider>
    )
}

export default BlendProvider

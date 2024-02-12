import { createContext, useContext, useEffect } from 'react'
import { GenericPalette } from '../lib/palettes'
import { BlendMode } from '../vis/mineral-blend'
import PartRenderer from '../vis/part'
import CoreRenderer from '../vis/core'

type BlendContextProps = {
    palette: GenericPalette,
    setPalette: (p: GenericPalette) => void,
    magnitudes: Array<number>,
    setMagnitudes: (m: Array<number>) => void,
    visibilities: Array<boolean>,
    setVisibilities: (v: Array<boolean>) => void,
    saturation: number,
    setSaturation: (s: number) => void,
    threshold: number,
    setThreshold: (t: number) => void,
    mode: BlendMode,
    setMode: (m: BlendMode) => void,
    monochrome: boolean,
    setMonochrome: (m: boolean) => void
}

const BlendContext = createContext<BlendContextProps | null>(null)

const useBlendState = (): BlendContextProps => {
    const context = useContext(BlendContext)
    if (context === null) {
        throw new Error('useBlendState must be called from a child of BlendProvider')
    }
    return context
}

const useBlending = (vis: PartRenderer | CoreRenderer | null): void => {
    const {
        magnitudes,
        visibilities,
        palette,
        saturation,
        threshold,
        mode,
        monochrome
    } = useBlendState()

    useEffect(() => {
        vis?.setBlending({
            magnitudes,
            visibilities,
            palette,
            saturation,
            threshold,
            mode,
            monochrome
        })
    }, [vis, magnitudes, visibilities, palette, saturation, threshold, mode, monochrome])
}

export default BlendContext
export {
    useBlendState,
    useBlending
}

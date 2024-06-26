import { createContext, useContext, useLayoutEffect } from 'react'
import { StringMap } from '../lib/util'
import { GenericPalette } from '../components/blend-provider'
import { BlendMode, BlendParams } from '../vis/mineral-blend'
import CoreRenderer from '../vis/core'
import PartRenderer from '../vis/part'

type BlendContextProps = {
    palette: GenericPalette,
    setPalette: (p: GenericPalette) => void,
    magnitudes: StringMap<number>,
    setMagnitudes: (m: StringMap<number>) => void,
    visibilities: StringMap<boolean>,
    setVisibilities: (v: StringMap<boolean>) => void,
    saturation: number,
    setSaturation: (s: number) => void,
    threshold: number,
    setThreshold: (t: number) => void,
    mode: BlendMode,
    setMode: (m: BlendMode) => void,
    monochrome: boolean,
    setMonochrome: (m: boolean) => void,
    setBlendParams: (b: BlendParams) => void,
    palettes: Array<GenericPalette>
}

const BlendContext = createContext<BlendContextProps | null>(null)

const useBlendState = (): BlendContextProps => {
    const context = useContext(BlendContext)
    if (context === null) {
        throw new Error('useBlendState must be called from a child of BlendProvider')
    }
    return context
}

const useBlending = (
    vis: CoreRenderer | PartRenderer | null,
    // allow any type for dependency, as is default for react
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    extraDependency?: any
): void => {
    const {
        magnitudes,
        visibilities,
        palette,
        saturation,
        threshold,
        mode,
        monochrome
    } = useBlendState()

    useLayoutEffect(() => {
        vis?.setBlending({
            magnitudes,
            visibilities,
            palette,
            saturation,
            threshold,
            mode,
            monochrome
        })
    }, [
        vis,
        magnitudes,
        visibilities,
        palette,
        saturation,
        threshold,
        mode,
        monochrome,
        extraDependency
    ])
}

export default BlendContext
export { useBlendState, useBlending }

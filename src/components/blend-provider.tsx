import { useState, useEffect, useCallback, ReactElement, ReactNode } from 'react'
import { vec3 } from 'gl-matrix'
import { useIdContext } from '../hooks/id-context'
import { StringMap } from '../lib/util'
import { fetchJson } from '../lib/load'
import { BlendMode, BlendParams } from '../vis/mineral-blend'
import BlendContext from '../hooks/blend-context'

type UnlabelledColors = Array<vec3>

type LabelledColors = { [mineral: string]: vec3 }

type GenericColors = LabelledColors | UnlabelledColors

type LabelledPalette = {
    type: 'labelled',
    colors: LabelledColors
}

type UnlabelledPalette = {
    type: 'unlabelled',
    colors: LabelledColors,
    unassigned: UnlabelledColors,
    colorSet: UnlabelledColors
}

type GenericPalette = LabelledPalette | UnlabelledPalette

function colorsToPalettes (
    colorsList: Array<GenericColors>,
    minerals: Array<string>
): Array<GenericPalette> {
    return colorsList.map(colors => {
        if (Array.isArray(colors)) {
            const colorMap: LabelledColors = {}
            colors.forEach((color, i) => {
                colorMap[minerals[i]] = color
            })
            return {
                type: 'unlabelled',
                colors: colorMap,
                unassigned: [],
                colorSet: colors
            }
        } else {
            return { type: 'labelled', colors }
        }
    })
}

type BlendProviderProps = {
    children: ReactNode
}

function BlendProvider (
    { children }: BlendProviderProps
): ReactElement {
    const { minerals } = useIdContext()
    const [magnitudes, setMagnitudes] = useState<StringMap<number>>(
        Object.fromEntries(minerals.map(mineral => [mineral, 1]))
    )
    const [visibilities, setVisibilities] = useState<StringMap<boolean>>(
        Object.fromEntries(minerals.map(mineral => [mineral, true]))
    )
    const [palette, setPalette] = useState<GenericPalette>({ type: 'labelled', colors: {} })
    const [saturation, setSaturation] = useState<number>(1)
    const [threshold, setThreshold] = useState<number>(0)
    const [mode, setMode] = useState<BlendMode>('additive')
    const [monochrome, setMonochrome] = useState<boolean>(false)

    const [palettes, setPalettes] = useState<Array<GenericPalette>>([])

    useEffect(() => {
        const getPalettes = async (): Promise<void> => {
            const colors = await fetchJson<Array<GenericColors>>(
                './data-processed/combined/color-presets.json'
            )

            if (colors) {
                const palettes = colorsToPalettes(colors, minerals)
                setPalettes(palettes)

                const palette = palettes[0]
                setPalette(palette)

                const visibilities: StringMap<boolean> = {}
                minerals.forEach(mineral => {
                    visibilities[mineral] = mineral in palette.colors
                })
                setVisibilities(visibilities)
            }
        }
        getPalettes()
    }, [minerals])

    const setBlendParams = useCallback((params: BlendParams) => {
        setMagnitudes(params.magnitudes)
        setVisibilities(params.visibilities)
        setPalette(params.palette)
        setSaturation(params.saturation)
        setThreshold(params.threshold)
        setMode(params.mode)
        setMonochrome(params.monochrome)
    }, [])

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
        setMonochrome,
        setBlendParams,
        palettes
    }

    return (
        <BlendContext.Provider value={value}>
            {children}
        </BlendContext.Provider>
    )
}

export default BlendProvider
export type { GenericPalette }

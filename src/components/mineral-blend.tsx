import { useState, useRef, useEffect, ReactElement } from 'react'
import { MdRemoveRedEye, MdOutlineRefresh } from 'react-icons/md'
import { IoCaretDownSharp } from 'react-icons/io5'
import { vec3 } from 'gl-matrix'
import { clamp, vecToHex, formatPercent, formatFloat } from '../lib/util'
import { BlendParams, BlendMode, GenericPalette, getBlendColor } from '../vis/mineral-blend'
import Dropdown from '../components/dropdown'
import Slider from '../components/slider'
import '../styles/mineral-blend.css'

const getColorHex = (color: vec3 | null): string => {
    if (!color) { return 'transparent' }
    const colorU8 = vec3.create()
    vec3.scale(colorU8, color, 255)
    vec3.floor(colorU8, colorU8)
    return `#${vecToHex(colorU8)}`
}

type ColorSwatchProps = {
    color: vec3 | null,
    mineral: string | null
}

function ColorSwatch (
    { color, mineral }: ColorSwatchProps
): ReactElement {
    return (
        <div
            className={'swatch'}
            style={{ backgroundColor: getColorHex(color) }}
            data-color={!!color}
        >
            { mineral && <p>{ mineral.substring(0, 3) }</p> }
        </div>
    )
}

type ColorPaletteProps = {
    item: GenericPalette
}

function ColorPalette (
    { item }: ColorPaletteProps
): ReactElement {
    return (
        <div className={'palette'}>
            { Object.entries(item.colors).map(([mineral, color], i) =>
                <ColorSwatch
                    mineral={item.type === 'labelled' ? mineral : null}
                    color={color}
                    key={i} />
            ) }
        </div>
    )
}

type MineralSliderProps = {
    mineral: string,
    index: number,
    blendParams: BlendParams,
    setBlendParams: (p: BlendParams) => void
}

function MineralSlider (
    { mineral, index, blendParams, setBlendParams }: MineralSliderProps
): ReactElement {
    const [magnitude, setMagnitude] = useState<number>(blendParams.magnitudes[index])
    const [visible, setVisible] = useState<boolean>(true)
    const [color, setColor] = useState<vec3 | null>(null)

    useEffect(() => {
        if (blendParams.palette.type === 'labelled') {
            const visibleMinerals = Object.keys(blendParams.palette.colors)
            setVisible(visibleMinerals.includes(mineral))
        } else {
            const numColors = blendParams.palette.colors.length
            setVisible(index < numColors)
        }
    }, [blendParams.palette, mineral, index])

    useEffect(() => {
        const newMagnitude = visible ? magnitude : 0
        if (newMagnitude !== blendParams.magnitudes[index]) {
            blendParams.magnitudes[index] = newMagnitude
            setBlendParams({ ...blendParams })
        }
    }, [magnitude, visible, index, blendParams, setBlendParams])

    useEffect(() => {
        setColor(getBlendColor(blendParams, mineral, index))
    }, [blendParams, mineral, index])

    return (
        <div
            className={'mineral-input'}
            data-visible={visible}
        >
            <Slider
                value={magnitude}
                setValue={setMagnitude}
                min={0}
                max={1}
                customClass={'mineral-slider'}
                customElements={textInput => [
                    <div>
                        <button
                            className={'visibility-button'}
                            onClick={() => setVisible(!visible)}
                        >
                            <MdRemoveRedEye />
                        </button>
                        <p className={'label'}>
                            {mineral}
                            <span className={'shortcut'}>
                                ({index + 1})
                            </span>
                        </p>
                    </div>,
                    <div>
                        {textInput}
                        <ColorSwatch color={color} mineral={null} />
                    </div>
                ]}
            />
        </div>
    )
}

type ParamSliderProps = {
    value: number,
    setValue: (v: number) => void,
    min: number,
    max: number,
    defaultValue?: number
}

function ParamSlider (
    { value, setValue, defaultValue, min, max }: ParamSliderProps
): ReactElement {
    const resetValue = (): void => {
        if (defaultValue !== undefined) {
            setValue(defaultValue)
        }
    }

    return (
        <Slider
            customClass={'param-slider'}
            value={value}
            setValue={setValue}
            min={min}
            max={max}
            customElements={textInput => [
                textInput,
                <button
                    data-visible={defaultValue !== undefined && value !== defaultValue}
                    onClick={resetValue}
                >
                    <MdOutlineRefresh />
                </button>
            ]}
        />
    )
}

type MineralBlendProps = {
    minerals: Array<string>,
    palettes: Array<GenericPalette>
    blendParams: BlendParams,
    setBlendParams: (p: BlendParams) => void
}

function MineralBlend (
    { minerals, palettes, blendParams, setBlendParams }: MineralBlendProps
): ReactElement {
    return (
        <section className={'blend-menu'}>
            <p>color+mineral presets</p>
            <div>
                <Dropdown
                    items={palettes.filter(p => p.type === 'labelled')}
                    selected={blendParams.palette.type === 'labelled'
                        ? blendParams.palette
                        : null}
                    setSelected={p => {
                        blendParams.palette = p
                        setBlendParams({ ...blendParams })
                    }}
                    Element={ColorPalette}
                    customClass={'palette-dropdown'}
                />
            </div>
            <p>color presets</p>
            <div>
                <Dropdown
                    items={palettes.filter(p => p.type === 'unlabelled')}
                    selected={blendParams.palette.type === 'unlabelled'
                        ? blendParams.palette
                        : null}
                    setSelected={p => {
                        blendParams.palette = p
                        setBlendParams({ ...blendParams })
                    }}
                    Element={ColorPalette}
                    customClass={'palette-dropdown'}
                />
            </div>
            <p>mineral color mixer</p>
            <div className={'mineral-mixer'}>
                { minerals.map((mineral, i) =>
                    <MineralSlider
                        mineral={mineral}
                        index={i}
                        blendParams={blendParams}
                        setBlendParams={setBlendParams}
                        key={i}
                    />
                ) }
            </div>
            <p>composite mode</p>
            <Dropdown<BlendMode>
                items={['additive', 'maximum']}
                selected={blendParams.mode}
                setSelected={m => {
                    blendParams.mode = m
                    setBlendParams({ ...blendParams })
                }}
                customClass={'blend-mode-dropdown'}
            />
            <div className={'params'}>
                <p>saturation</p>
                <ParamSlider
                    value={blendParams.saturation}
                    setValue={s => {
                        blendParams.saturation = s
                        setBlendParams({ ...blendParams })
                    }}
                    min={0.1}
                    max={2}
                    defaultValue={1}
                />
                <p>threshold</p>
                <ParamSlider
                    value={blendParams.threshold}
                    setValue={t => {
                        blendParams.threshold = t
                        setBlendParams({ ...blendParams })
                    }}
                    min={0}
                    max={0.99}
                    defaultValue={0}
                />
            </div>
        </section>
    )
}

export default MineralBlend

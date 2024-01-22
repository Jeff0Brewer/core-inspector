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
    const [magnitude, setMagnitude] = useState<number>(1)
    const [visible, setVisible] = useState<boolean>(true)
    const [color, setColor] = useState<vec3 | null>(null)

    const [dragging, setDragging] = useState<boolean>(false)
    const sliderRef = useRef<HTMLDivElement>(null)
    const textInputRef = useRef<HTMLInputElement>(null)

    // store valid text value to revert if user input invalid
    const lastValidTextRef = useRef<string>(
        formatPercent(blendParams.magnitudes[index])
    )
    const cleanTextTimeoutIdRef = useRef<number>(-1)

    useEffect(() => {
        const newMagnitude = visible ? magnitude : 0
        if (blendParams.magnitudes[index] !== newMagnitude) {
            blendParams.magnitudes[index] = newMagnitude
            setBlendParams({ ...blendParams })
        }
    }, [blendParams, setBlendParams, magnitude, visible, index])

    useEffect(() => {
        setColor(getBlendColor(blendParams, mineral, index))
    }, [blendParams, mineral, index])

    useEffect(() => {
        const slider = sliderRef.current
        const textInput = textInputRef.current
        if (!slider || !textInput) {
            throw new Error('No reference to input elements')
        }

        const updatePercentageMouse = (e: MouseEvent): void => {
            const { left, right } = slider.getBoundingClientRect()
            const clickPercentage = clamp((e.clientX - left) / (right - left), 0, 1)
            setMagnitude(clickPercentage)

            // update text input with value from mouse
            const formatted = formatPercent(clickPercentage)
            textInput.value = formatted
            lastValidTextRef.current = formatted
        }

        if (!dragging) {
            // if not dragging, only need handler to start drag on mouse down
            const mousedown = (e: MouseEvent): void => {
                updatePercentageMouse(e)
                setDragging(true)
                setVisible(true)
            }
            slider.addEventListener('mousedown', mousedown)
            return () => {
                slider.removeEventListener('mousedown', mousedown)
            }
        } else {
            // attach dragging events to window so drag can extend past
            // slider bounds once started
            const mouseup = (): void => { setDragging(false) }
            const mouseleave = (): void => { setDragging(false) }
            const mousemove = (e: MouseEvent): void => {
                updatePercentageMouse(e)
            }
            window.addEventListener('mouseup', mouseup)
            window.addEventListener('mouseleave', mouseleave)
            window.addEventListener('mousemove', mousemove)
            return () => {
                window.removeEventListener('mouseup', mouseup)
                window.removeEventListener('mouseleave', mouseleave)
                window.removeEventListener('mousemove', mousemove)
            }
        }
    }, [dragging, setMagnitude, setVisible])

    const updatePercentageText = (): void => {
        if (!textInputRef.current) {
            throw new Error('No reference to text input element')
        }

        const value = parseFloat(textInputRef.current.value)
        if (!Number.isNaN(value)) {
            const magnitude = clamp(value * 0.01, 0, 1)
            setMagnitude(magnitude)
            lastValidTextRef.current = formatPercent(magnitude)
        }

        // revert to valid text value after period of no user input
        window.clearTimeout(cleanTextTimeoutIdRef.current)
        cleanTextTimeoutIdRef.current = window.setTimeout((): void => {
            if (textInputRef.current) {
                textInputRef.current.value = lastValidTextRef.current
            }
        }, 5000)
    }

    return (
        <div
            className={'mineral'}
            data-visible={visible}
            data-dragging={dragging}
        >
            {/* slider div before top label to ensure lower z-index */}
            <div
                ref={sliderRef}
                className={'slider'}
                style={{ paddingRight: `${(1 - magnitude) * 100}%` }}
            >
                <div className={'arrow'}><IoCaretDownSharp /></div>
            </div>
            <div className={'top'}>
                <div>
                    <a onClick={() => setVisible(!visible)}>
                        <MdRemoveRedEye />
                    </a>
                    <p>{mineral}
                        <span className={'shortcut'}>({index + 1})</span>
                    </p>
                </div>
                <div>
                    <div className={'percentage'}>
                        <input
                            ref={textInputRef}
                            type="text"
                            defaultValue={lastValidTextRef.current}
                            onInput={updatePercentageText}
                        />
                        %
                    </div>
                    <ColorSwatch color={visible ? color : null} mineral={null} />
                </div>
            </div>
        </div>
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
            customElements={[
                'textInput',
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

export default MineralBlend

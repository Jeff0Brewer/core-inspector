import React, { ReactElement, useEffect } from 'react'
import { vec3 } from 'gl-matrix'
import { MdRemoveRedEye, MdOutlineRefresh } from 'react-icons/md'
import { IoCaretDownSharp } from 'react-icons/io5'
import { getCssColor, formatPercent, parsePercent, StringMap } from '../lib/util'
import { useIdContext } from '../hooks/id-context'
import { useBlendState } from '../hooks/blend-context'
import { useCollapseRender } from '../hooks/collapse-render'
import { GenericPalette } from '../components/blend-provider'
import { BlendMode, getBlendColor, isToggleable } from '../vis/mineral-blend'
import Dropdown from '../components/generic/dropdown'
import Slider from '../components/generic/slider'
import styles from '../styles/blend-menu.module.css'
import paletteDropdownStyles from '../styles/custom/palette-dropdown.module.css'
import blendModeDropdownStyles from '../styles/custom/blend-mode-dropdown.module.css'
import mineralSliderStyles from '../styles/custom/mineral-slider.module.css'
import paramSliderStyles from '../styles/custom/param-slider.module.css'

type BlendMenuProps = {
    open: boolean
}

const BlendMenu = React.memo((
    { open }: BlendMenuProps
): ReactElement => {
    const { minerals } = useIdContext()
    const render = useCollapseRender(open)
    const {
        palette, setPalette,
        magnitudes, setMagnitudes,
        visibilities, setVisibilities,
        saturation, setSaturation,
        threshold, setThreshold,
        mode, setMode,
        monochrome, setMonochrome,
        palettes
    } = useBlendState()

    // update visibilities to match newly selected palette on change
    useEffect(() => {
        const visibilities: StringMap<boolean> = {}
        if (palette.type === 'labelled') {
            minerals.forEach(mineral => {
                visibilities[mineral] = mineral in palette.colors
            })
        } else {
            minerals.forEach((mineral, i) => {
                visibilities[mineral] = i < palette.colors.length
            })
        }
        setVisibilities(visibilities)
    }, [palette, minerals, setVisibilities])

    // setup keyboard shortcuts
    useEffect(() => {
        const keydown = (e: KeyboardEvent): void => {
            // Don't trigger shortcuts if input element is focused.
            if (document.activeElement?.tagName.toLowerCase() === 'input') {
                return
            }

            if (e.key === 'b') {
                setMonochrome(!monochrome)
                return
            }
            const numKey = parseInt(e.key)
            if (numKey > 0 && numKey <= minerals.length) {
                const mineral = minerals[numKey - 1]
                visibilities[mineral] = !visibilities[mineral]
                setVisibilities({ ...visibilities })
            }
        }
        window.addEventListener('keydown', keydown)
        return () => {
            window.removeEventListener('keydown', keydown)
        }
    }, [monochrome, visibilities, minerals, setMonochrome, setVisibilities])

    // sets magnitude for single index, used in mineral sliders
    const getMagnitudeSetter = (mineral: string): ((m: number) => void) => {
        return (m: number) => {
            if (visibilities[mineral]) {
                magnitudes[mineral] = m
                setMagnitudes({ ...magnitudes })
            }
        }
    }

    // sets visiblility for single index, used in mineral sliders
    const getVisibilitySetter = (mineral: string): ((v: boolean) => void) => {
        return (v: boolean) => {
            visibilities[mineral] = v
            setVisibilities({ ...visibilities })
        }
    }

    return (
        <section className={`${styles.blendMenu} ${open && styles.visible}`}>
            { render && <>
                <MonochromeToggle
                    palette={palette}
                    monochrome={monochrome}
                    setMonochrome={setMonochrome}
                />
                <p>color+mineral presets</p>
                <div>
                    <Dropdown
                        items={palettes.filter(p => p.type === 'labelled')}
                        selected={palette.type === 'labelled' ? palette : null}
                        setSelected={setPalette}
                        Element={ColorPaletteItem}
                        customStyles={paletteDropdownStyles}
                    />
                </div>
                <p>color presets</p>
                <div>
                    <Dropdown
                        items={palettes.filter(p => p.type === 'unlabelled')}
                        selected={palette.type === 'unlabelled' ? palette : null}
                        setSelected={setPalette}
                        Element={ColorPaletteItem}
                        customStyles={paletteDropdownStyles}
                    />
                </div>
                <p>mineral color mixer</p>
                <div className={styles.mineralMixer}>
                    { minerals.map((mineral, i) =>
                        <MineralSlider
                            mineral={mineral}
                            color={getBlendColor(palette, visibilities, monochrome, mineral)}
                            magnitude={magnitudes[mineral]}
                            setMagnitude={getMagnitudeSetter(mineral)}
                            visible={visibilities[mineral]}
                            setVisible={getVisibilitySetter(mineral)}
                            disabled={!isToggleable(mineral, palette, visibilities)}
                            index={i}
                            key={i}
                        />
                    ) }
                </div>
                <p>composite mode</p>
                <Dropdown<BlendMode>
                    items={['additive', 'maximum']}
                    selected={mode}
                    setSelected={setMode}
                    customStyles={blendModeDropdownStyles}
                />
                <div className={styles.params}>
                    <p>saturation</p>
                    <ParamSlider
                        value={saturation}
                        setValue={setSaturation}
                        min={0.1}
                        max={2}
                        defaultValue={1}
                    />
                    <p>threshold</p>
                    <ParamSlider
                        value={threshold}
                        setValue={setThreshold}
                        min={0}
                        max={0.99}
                        defaultValue={0}
                    />
                </div>
            </> }
        </section>
    )
})

type MineralSliderProps = {
    mineral: string,
    index: number,
    color: vec3 | null,
    magnitude: number,
    setMagnitude: (m: number) => void,
    visible: boolean,
    setVisible: (v: boolean) => void,
    disabled: boolean
}

const MineralSlider = React.memo((
    { mineral, index, color, magnitude, setMagnitude, visible, setVisible, disabled }: MineralSliderProps
): ReactElement => {
    return (
        <div
            className={`${
                mineralSliderStyles.wrap} ${
                disabled && mineralSliderStyles.disabled
            }`}
            data-visible={visible}
        >
            <Slider
                value={magnitude}
                setValue={setMagnitude}
                min={0}
                max={1}
                format={{ apply: formatPercent, parse: parsePercent }}
                customStyles={mineralSliderStyles}
                customElement={textInput => <>
                    <div>
                        <button
                            className={mineralSliderStyles.visibilityButton}
                            onClick={() => setVisible(!visible)}
                        >
                            <MdRemoveRedEye />
                        </button>
                        <p className={mineralSliderStyles.label}>
                            {mineral}
                            <span className={mineralSliderStyles.shortcut}>
                                ({index + 1})
                            </span>
                        </p>
                    </div>
                    <div>
                        {textInput}
                        <ColorSwatch
                            color={color}
                            mineral={null}
                            customClass={mineralSliderStyles.sliderSwatch}
                        />
                    </div>
                </>}
                customHandle={
                    <div className={mineralSliderStyles.sliderHandle}>
                        <IoCaretDownSharp />
                    </div>
                }
            />
        </div>
    )
})

type ParamSliderProps = {
    value: number,
    setValue: (v: number) => void,
    min: number,
    max: number,
    defaultValue?: number
}

const ParamSlider = React.memo((
    { value, setValue, defaultValue, min, max }: ParamSliderProps
): ReactElement => {
    const resetValue = (): void => {
        if (defaultValue !== undefined) {
            setValue(defaultValue)
        }
    }

    return (
        <Slider
            value={value}
            setValue={setValue}
            min={min}
            max={max}
            customStyles={paramSliderStyles}
            customElement={textInput => <>
                {textInput}
                <button
                    data-visible={defaultValue !== undefined && value !== defaultValue}
                    onClick={resetValue}
                >
                    <MdOutlineRefresh />
                </button>
            </>}
        />
    )
})

type ColorSwatchProps = {
    color: vec3 | null,
    mineral: string | null,
    customClass?: string
}

const ColorSwatch = React.memo((
    { color, mineral, customClass }: ColorSwatchProps
): ReactElement => {
    return (
        <div
            className={`${styles.swatch} ${!color && styles.emptySwatch} ${customClass}`}
            style={{ backgroundColor: getCssColor(color) }}
        >
            { mineral && <p>{ mineral.substring(0, 3) }</p> }
        </div>
    )
})

type MonochromeToggleProps = {
    palette: GenericPalette,
    monochrome: boolean,
    setMonochrome: (m: boolean) => void
}

const MonochromeToggle = React.memo((
    { palette, monochrome, setMonochrome }: MonochromeToggleProps
): ReactElement => {
    const color = !monochrome
        ? getCssColor(Object.values(palette.colors)[0])
        : '#fff'

    return (
        <button
            className={styles.monochromeToggle}
            style={{ backgroundColor: color }}
            onClick={() => setMonochrome(!monochrome)}
        ></button>
    )
})

type ColorPaletteItemProps = {
    item: GenericPalette
}

function ColorPaletteItem ({ item }: ColorPaletteItemProps): ReactElement {
    return (
        <div className={styles.palette}>
            { Object.entries(item.colors).map(([mineral, color], i) =>
                <ColorSwatch
                    mineral={item.type === 'labelled' ? mineral : null}
                    color={color}
                    key={i}
                />
            ) }
        </div>
    )
}

export default BlendMenu

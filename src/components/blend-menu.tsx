import { ReactElement } from 'react'
import { vec3 } from 'gl-matrix'
import { MdRemoveRedEye, MdOutlineRefresh } from 'react-icons/md'
import { IoCaretDownSharp } from 'react-icons/io5'
import { getCssColor, formatPercent, parsePercent } from '../lib/util'
import { useBlendState } from '../components/blend-context'
import { GenericPalette } from '../lib/palettes'
import { BlendMode, getBlendColor } from '../vis/mineral-blend'
import Dropdown from '../components/generic/dropdown'
import Slider from '../components/generic/slider'

type BlendMenuProps = {
    minerals: Array<string>,
    palettes: Array<GenericPalette>
}

function BlendMenu (
    { minerals, palettes }: BlendMenuProps
): ReactElement {
    const {
        palette, setPalette,
        magnitudes, setMagnitudes,
        visibilities, setVisibilities,
        saturation, setSaturation,
        threshold, setThreshold,
        mode, setMode,
        monochrome, setMonochrome
    } = useBlendState()

    // sets magnitude for single index, used in mineral sliders
    const getMagnitudeSetter = (index: number): ((m: number) => void) => {
        return (m: number) => {
            magnitudes[index] = m
            visibilities[index] = true
            setMagnitudes([...magnitudes])
            setVisibilities([...visibilities])
        }
    }

    // sets visiblility for single index, used in mineral sliders
    const getVisibilitySetter = (index: number): ((v: boolean) => void) => {
        return (v: boolean) => {
            visibilities[index] = v
            setVisibilities([...visibilities])
        }
    }

    return (
        <section className={'blend-menu'}>
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
                    Element={ColorPalette}
                    customClass={'palette-dropdown'}
                />
            </div>
            <p>color presets</p>
            <div>
                <Dropdown
                    items={palettes.filter(p => p.type === 'unlabelled')}
                    selected={palette.type === 'unlabelled' ? palette : null}
                    setSelected={setPalette}
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
                        color={getBlendColor(palette, visibilities, monochrome, mineral, i)}
                        magnitude={magnitudes[i]}
                        setMagnitude={getMagnitudeSetter(i)}
                        visible={visibilities[i]}
                        setVisible={getVisibilitySetter(i)}
                        key={i}
                    />
                ) }
            </div>
            <p>composite mode</p>
            <Dropdown<BlendMode>
                items={['additive', 'maximum']}
                selected={mode}
                setSelected={setMode}
                customClass={'blend-mode-dropdown'}
            />
            <div className={'params'}>
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
        </section>
    )
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
            style={{ backgroundColor: getCssColor(color) }}
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
                    key={i}
                />
            ) }
        </div>
    )
}

type MineralSliderProps = {
    mineral: string,
    index: number,
    color: vec3 | null,
    magnitude: number,
    setMagnitude: (m: number) => void,
    visible: boolean,
    setVisible: (v: boolean) => void,
}

function MineralSlider (
    { mineral, index, color, magnitude, setMagnitude, visible, setVisible }: MineralSliderProps
): ReactElement {
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
                format={{ apply: formatPercent, parse: parsePercent }}
                customClass={'mineral-slider'}
                customElement={textInput => <>
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
                    </div>
                    <div>
                        {textInput}
                        <ColorSwatch color={color} mineral={null} />
                    </div>
                </>}
                customHandle={
                    <div className={'slider-handle'}>
                        <IoCaretDownSharp />
                    </div>
                }
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
}

type MonochromeToggleProps = {
    palette: GenericPalette,
    monochrome: boolean,
    setMonochrome: (m: boolean) => void
}

function MonochromeToggle (
    { palette, monochrome, setMonochrome }: MonochromeToggleProps
): ReactElement {
    const color = !monochrome
        ? getCssColor(Object.values(palette.colors)[0])
        : '#fff'

    return (
        <button
            className={'monochrome-toggle'}
            style={{ backgroundColor: color }}
            onClick={() => setMonochrome(!monochrome)}
        ></button>
    )
}

export default BlendMenu
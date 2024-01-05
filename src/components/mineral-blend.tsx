import { useState, useRef, useEffect, useCallback, ReactElement } from 'react'
import { MdRemoveRedEye, MdColorLens } from 'react-icons/md'
import { PiCaretDownBold } from 'react-icons/pi'
import { IoCaretDownSharp } from 'react-icons/io5'
import { vec3 } from 'gl-matrix'
import { clamp, vecToHex, formatPercent } from '../lib/util'
import { VIS_DEFAULTS } from '../vis/vis'
import '../styles/mineral-blend.css'

type LabelledPalette = { [mineral: string]: vec3 }
type UnlabelledPalette = Array<vec3>
type GenericPalette = LabelledPalette | UnlabelledPalette

const COLOR_MINERAL_PRESETS: Array<LabelledPalette> = [
    {
        chlorite: [0.6039, 0.6588, 0.5647],
        epidote: [0.6705, 0.7411, 0.6823],
        prehnite: [0.4156, 0.4745, 0.5764],
        zeolite: [1, 1, 1],
        amphibole: [0.8, 0.7843, 0.6941],
        pyroxene: [0.8039, 0.8509, 0.8666],
        gypsum: [0.4431, 0.5960, 0.3333],
        carbonate: [0.4705, 0.3450, 0.5882]
    }, {
        chlorite: [0.2470, 0.6549, 0.8392],
        prehnite: [0.8039, 0.3490, 0.5647],
        zeolite: [0.9686, 0.6156, 0.5176],
        carbonate: [0.9803, 0.7529, 0.3686],
        'kaolinite-montmorillinite': [0.9333, 0.3882, 0.3215]
    }
]

const COLOR_PRESETS: Array<UnlabelledPalette> = [
    [
        [0.4705, 0.3450, 0.5882],
        [0.6705, 0.7411, 0.6862],
        [0.4156, 0.4745, 0.5764]
    ], [
        [0.3803, 0.2313, 0.3529],
        [0.5372, 0.3764, 0.5568],
        [0.7294, 0.5843, 0.5764],
        [0.9294, 0.9764, 0.6666],
        [0.7843, 0.9803, 0.7411]
    ],
    [
        [0.9647, 0.4274, 0.6078],
        [0.3921, 0.4549, 0.8039],
        [0.3019, 0.7529, 0.7098],
        [0.2039, 0.5647, 0.8627],
        [0.2196, 0.7568, 0.4470],
        [0.5843, 0.3803, 0.8862],
        [0.8901, 0.2039, 0.1843],
        [0.9647, 0.6, 0.2470],
        [1, 0.9294, 0.2901]
    ]
]

type ColorSwatchProps = {
    color: vec3 | null,
    mineral: string | null
}

function ColorSwatch (
    { color, mineral }: ColorSwatchProps
): ReactElement {
    const getColor = (color: vec3 | null): string => {
        if (!color) { return 'transparent' }
        const colorU8 = color.map(v => Math.floor(v * 255))
        return `#${vecToHex(colorU8)}`
    }

    return (
        <div
            className={'swatch'}
            style={{ backgroundColor: getColor(color) }}
            data-color={!!color}
        >
            { mineral && <p>{ mineral.substring(0, 3) }</p> }
        </div>
    )
}

type ColorPaletteProps = {
    palette: GenericPalette
}

function ColorPalette (
    { palette }: ColorPaletteProps
): ReactElement {
    const isLabelled = !Array.isArray(palette)
    return (
        <div className={'palette'}>
            { Object.entries(palette).map(([mineral, color], i) =>
                <ColorSwatch
                    mineral={isLabelled ? mineral : null}
                    color={color}
                    key={i} />
            ) }
        </div>
    )
}

type ColorDropdownProps = {
    palettes: Array<GenericPalette>,
    selected: GenericPalette | null,
    setSelected: (s: GenericPalette) => void
}

function ColorDropdown (
    { palettes, selected, setSelected }: ColorDropdownProps
): ReactElement {
    const [open, setOpen] = useState<boolean>(false)

    return (
        <div
            className={'dropdown'}
            data-open={open}
            data-selected={!!selected}
        >
            <div className={'label'}>
                <div className={'selected'}>
                    { selected && <ColorPalette palette={selected} />}
                </div>
                <button onClick={() => setOpen(!open)}>
                    <PiCaretDownBold />
                </button>
            </div>
            <div className={'items'}>
                { palettes.map((palette, i) =>
                    <a key={i} onClick={() => {
                        setSelected(palette)
                        setOpen(false)
                    }}>
                        <ColorPalette palette={palette} />
                    </a>) }
            </div>
        </div>
    )
}

type MineralSliderProps = {
    mineral: string,
    color: vec3 | null,
    visible: boolean,
    setVisible: (v: boolean) => void,
    magnitude: number,
    setMagnitude: (m: number) => void
}

function MineralSlider (
    { mineral, color, visible, setVisible, magnitude, setMagnitude }: MineralSliderProps
): ReactElement {
    const [dragging, setDragging] = useState<boolean>(false)
    const sliderRef = useRef<HTMLDivElement>(null)
    const textInputRef = useRef<HTMLInputElement>(null)

    // store valid text value to revert if user input invalid
    const lastValidTextRef = useRef<string>(formatPercent(magnitude))
    const cleanTextTimeoutIdRef = useRef<number>(-1)

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
                    <p>{mineral}</p>
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
    currMineral: number,
    setMineral: (i: number) => void,
    setBlending: (m: Array<number>, c: Array<vec3 | null>) => void
}

function MineralBlend (
    { minerals, currMineral, setMineral, setBlending }: MineralBlendProps
): ReactElement {
    const [open, setOpen] = useState<boolean>(true)
    const [selected, setSelected] = useState<GenericPalette>(COLOR_PRESETS[0])
    const [visibilities, setVisibilities] = useState<Array<boolean>>(
        Array(minerals.length).fill(true)
    )
    const [magnitudes, setMagnitudes] = useState<Array<number>>(
        Array(minerals.length).fill(VIS_DEFAULTS.mineral.blendMagnitude)
    )

    // assigns colors from palettes to mineral sliders based
    // on current visibilities and palette type
    const getColor = useCallback((mineral: string, index: number): vec3 | null => {
        const isLabelled = !Array.isArray(selected)
        let color
        if (isLabelled) {
            color = selected[mineral] || null
        } else {
            if (visibilities[index]) {
                const ind = visibilities.slice(0, index).filter(v => v).length
                color = selected[ind]
            } else {
                color = null
            }
        }
        return color
    }, [selected, visibilities])

    // init visibilities on palette change, hide minerals not present in
    // labelled keys and hide minerals not in unlabelled array bounds
    useEffect(() => {
        const isLabelled = !Array.isArray(selected)
        const visibilities = Array(minerals.length).fill(false)
        if (isLabelled) {
            const visibleMinerals = Object.keys(selected)
            for (let i = 0; i < minerals.length; i++) {
                visibilities[i] = visibleMinerals.indexOf(minerals[i]) !== -1
            }
        } else {
            for (let i = 0; i < selected.length; i++) {
                visibilities[i] = true
            }
        }
        setVisibilities(visibilities)
    }, [selected, minerals])

    // apply blending on changes to visibilities or magnitudes
    useEffect(() => {
        const colors = minerals.map((mineral, i) => getColor(mineral, i))
        const visibleMagnitudes = magnitudes.map((mag, i) => visibilities[i] ? mag : 0)
        setBlending(visibleMagnitudes, colors)
    }, [visibilities, magnitudes, minerals, getColor, setBlending])

    // close blend menu if not currently using blended output
    useEffect(() => {
        if (currMineral >= 0) {
            setOpen(false)
        }
    }, [currMineral])

    const getVisibilitySetter = (ind: number): ((v: boolean) => void) => {
        return (v: boolean) => {
            visibilities[ind] = v
            setVisibilities([...visibilities])
        }
    }

    const getMagnitudeSetter = (ind: number): ((m: number) => void) => {
        return (m: number) => {
            magnitudes[ind] = m
            setMagnitudes([...magnitudes])
        }
    }

    const isLabelled = !Array.isArray(selected)
    return (
        <div className={'blend'}>
            <button
                onClick={() => {
                    setMineral(-1)
                    setOpen(!open)
                }}
                data-active={currMineral < 0}
            >
                <MdColorLens />
            </button>
            { open && <section className={'menu'}>
                <p>color+mineral presets</p>
                <div>
                    <ColorDropdown
                        palettes={COLOR_MINERAL_PRESETS}
                        selected={isLabelled ? selected : null}
                        setSelected={setSelected}
                    />
                </div>
                <p>color presets</p>
                <div>
                    <ColorDropdown
                        palettes={COLOR_PRESETS}
                        selected={!isLabelled ? selected : null}
                        setSelected={setSelected}
                    />
                </div>
                <p>mineral color mixer</p>
                <div className={'mineral-mixer'}>
                    { minerals.map((mineral, i) =>
                        <MineralSlider
                            key={i}
                            mineral={mineral}
                            color={getColor(mineral, i)}
                            visible={visibilities[i]}
                            setVisible={getVisibilitySetter(i)}
                            magnitude={magnitudes[i]}
                            setMagnitude={getMagnitudeSetter(i)}
                        />
                    ) }
                </div>
            </section> }
        </div>
    )
}

export default MineralBlend

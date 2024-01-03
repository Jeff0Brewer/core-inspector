import { useState, useRef, useEffect, useCallback, ReactElement } from 'react'
import { MdRemoveRedEye, MdColorLens } from 'react-icons/md'
import { PiCaretDownBold } from 'react-icons/pi'
import { IoCaretDownSharp } from 'react-icons/io5'
import { vec3 } from 'gl-matrix'
import { clamp, vecToHex } from '../lib/util'
import { VIS_DEFAULTS } from '../vis/vis'
import '../styles/mineral-blend.css'

type LabelledPalette = { [mineral: string]: vec3 }
type UnlabelledPalette = Array<vec3>

type MineralBlendProps = {
    minerals: Array<string>,
    currMineral: number,
    setMineral: (i: number) => void,
    setBlending: (m: Array<number>, c: Array<vec3 | null>) => void
}

function MineralBlend (
    { minerals, currMineral, setMineral, setBlending }: MineralBlendProps
): ReactElement {
    const [palette, setPalette] = useState<LabelledPalette | UnlabelledPalette>(COLOR_PRESETS[0])
    const [visibilities, setVisibilities] = useState<Array<boolean>>(Array(minerals.length).fill(true))
    const [magnitudes, setMagnitudes] = useState<Array<number>>(
        Array(minerals.length).fill(VIS_DEFAULTS.mineral.blendMagnitude)
    )
    const [open, setOpen] = useState<boolean>(true)

    const getColor = useCallback((mineral: string, index: number): vec3 | null => {
        const isLabelled = !Array.isArray(palette)
        let color
        if (isLabelled) {
            color = palette[mineral] || null
        } else {
            if (visibilities[index]) {
                const ind = visibilities.slice(0, index).filter(v => v).length
                color = palette[ind]
            } else {
                color = null
            }
        }
        return color
    }, [palette, visibilities])

    // init visibilities on palette change, hide minerals not present in
    // labelled keys and hide minerals not in unlabelled array bounds
    useEffect(() => {
        const isLabelled = !Array.isArray(palette)
        const visibilities = Array(minerals.length).fill(false)
        if (isLabelled) {
            const visibleMinerals = Object.keys(palette)
            for (let i = 0; i < minerals.length; i++) {
                const visible = visibleMinerals.indexOf(minerals[i]) !== -1
                if (visible) {
                    visibilities[i] = true
                }
            }
        } else {
            for (let i = 0; i < palette.length; i++) {
                visibilities[i] = true
            }
        }
        setVisibilities(visibilities)
    }, [palette, minerals])

    useEffect(() => {
        const colors = []
        for (let i = 0; i < minerals.length; i++) {
            colors.push(getColor(minerals[i], i))
        }
        const visibleMagnitudes = magnitudes.map((mag, i) => visibilities[i] ? mag : 0)
        setBlending(visibleMagnitudes, colors)
    }, [minerals, visibilities, magnitudes, getColor, setBlending])

    // close blend menu if not currently using blended output
    useEffect(() => {
        if (currMineral >= 0) {
            setOpen(false)
        }
    }, [currMineral])

    const isLabelled = !Array.isArray(palette)
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
                        items={COLOR_MINERAL_PRESETS}
                        selected={isLabelled ? palette : null}
                        setSelected={setPalette}
                    />
                </div>
                <p>color presets</p>
                <div>
                    <ColorDropdown
                        items={COLOR_PRESETS}
                        selected={!isLabelled ? palette : null}
                        setSelected={setPalette}
                    />
                </div>
                <p>mineral color mixer</p>
                <div>
                    { minerals.map((mineral, i) => {
                        const setVisible = (v: boolean): void => {
                            visibilities[i] = v
                            setVisibilities([...visibilities])
                        }
                        const setMagnitude = (m: number): void => {
                            magnitudes[i] = m
                            setMagnitudes([...magnitudes])
                        }
                        return <MineralBlender
                            key={i}
                            mineral={mineral}
                            color={getColor(mineral, i)}
                            visible={visibilities[i]}
                            setVisible={setVisible}
                            magnitude={magnitudes[i]}
                            setMagnitude={setMagnitude}
                        />
                    }) }
                </div>
            </section> }
        </div>
    )
}

type ColorPaletteProps = {
    palette: LabelledPalette | UnlabelledPalette
}

function ColorPalette (
    { palette }: ColorPaletteProps
): ReactElement {
    const isLabelled = !Array.isArray(palette)
    return (
        <div className={'palette'}>
            { isLabelled
                ? Object.entries(palette).map(([mineral, color], i) =>
                    <ColorSwatch mineral={mineral} color={color} key={i} />)
                : palette.map((color, i) =>
                    <ColorSwatch color={color} key={i} />) }
        </div>
    )
}

type ColorSwatchProps = {
    color: vec3 | null,
    mineral?: string
}

function ColorSwatch (
    { color, mineral }: ColorSwatchProps
): ReactElement {
    const getColor = (color: vec3 | null): string => {
        if (!color) {
            return 'transparent'
        }
        const colorU8 = vec3.create()
        vec3.scale(colorU8, color, 255)
        vec3.floor(colorU8, colorU8)
        return `#${vecToHex([...colorU8])}`
    }

    return (
        <div
            className={'swatch'}
            data-color={!!color}
            style={{ backgroundColor: getColor(color) }}
        >
            { mineral && <p>
                { mineral.substring(0, 3) }
            </p> }
        </div>
    )
}

type ColorDropdownProps<T extends LabelledPalette | UnlabelledPalette> = {
    items: Array<T>,
    selected: T | null,
    setSelected: (s: T) => void
}

function ColorDropdown<T extends LabelledPalette | UnlabelledPalette> (
    { items, selected, setSelected }: ColorDropdownProps<T>
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
                    { selected !== null &&
                        <ColorPalette palette={selected} />}
                </div>
                <button onClick={() => setOpen(!open)}>
                    <PiCaretDownBold />
                </button>
            </div>
            <div className={'content'}>
                { items.map((item, i) =>
                    <a key={i} onClick={() => {
                        setSelected(item)
                        setOpen(false)
                    }}>
                        <ColorPalette palette={item} />
                    </a>) }
            </div>
        </div>
    )
}

const formatPercent = (p: number): string => {
    return (p * 100).toFixed()
}

type MineralBlenderProps = {
    mineral: string,
    color: vec3 | null,
    visible: boolean,
    setVisible: (v: boolean) => void,
    magnitude: number,
    setMagnitude: (m: number) => void
}

function MineralBlender (
    { mineral, color, visible, setVisible, magnitude, setMagnitude }: MineralBlenderProps
): ReactElement {
    const [dragging, setDragging] = useState<boolean>(false)
    const sliderRef = useRef<HTMLDivElement>(null)
    const textInputRef = useRef<HTMLInputElement>(null)

    const lastValidTextRef = useRef<string>(formatPercent(magnitude))
    const cleanTextTimeoutIdRef = useRef<number>(-1)

    const updatePercentageText = (): void => {
        if (!textInputRef.current) {
            throw new Error('No reference to text input element')
        }

        const value = parseFloat(textInputRef.current.value)
        if (!Number.isNaN(value) && value >= 0 && value <= 100) {
            const magnitude = value * 0.01
            setMagnitude(magnitude)
            // store valid text input value to revert to
            // if user input invalid
            lastValidTextRef.current = formatPercent(magnitude)
        }

        window.clearTimeout(cleanTextTimeoutIdRef.current)
        cleanTextTimeoutIdRef.current = window.setTimeout((): void => {
            if (textInputRef.current) {
                textInputRef.current.value = lastValidTextRef.current
            }
        }, 5000)
    }

    useEffect(() => {
        const slider = sliderRef.current
        const textInput = textInputRef.current
        if (!slider || !textInput) {
            throw new Error('No reference to input elements')
        }

        const updatePercentageMouse = (e: MouseEvent): void => {
            const { left, right } = slider.getBoundingClientRect()
            const dx = e.clientX - left
            const width = right - left
            const clickPercentage = clamp(dx / width, 0, 1)

            setMagnitude(clickPercentage)
            textInput.value = formatPercent(clickPercentage)
        }

        if (!dragging) {
            const mousedown = (e: MouseEvent): void => {
                updatePercentageMouse(e)
                setDragging(true)
                setVisible(true)
            }
            // attach only mousedown event to slider so drag
            // can extend past slider bounds once started
            slider.addEventListener('mousedown', mousedown)
            return () => {
                slider.removeEventListener('mousedown', mousedown)
            }
        }

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
    }, [dragging, setMagnitude, setVisible])

    return (
        <div
            className={'mineral'}
            data-visible={visible}
            data-dragging={dragging}
        >
            <div className={'top'}>
                <div>
                    <a onClick={(): void => { setVisible(!visible) }}>
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
                    <div>
                        <ColorSwatch color={visible ? color : null} />
                    </div>
                </div>
            </div>
            <div ref={sliderRef} className={'slider'}>
                <div
                    className={'arrow'}
                    style={{ left: `${magnitude * 100}%` }}
                >
                    <IoCaretDownSharp />
                </div>
                <div
                    className={'value'}
                    style={{ width: `${magnitude * 100}%` }}
                ></div>
            </div>
        </div>
    )
}

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
        prehnite: [0.34901960784313724, 0.803921568627451, 0.5647058823529412],
        chlorite: [0.24705882352941178, 0.6549019607843137, 0.8392156862745098],
        pyroxene: [0.9803921568627451, 0.7529411764705882, 0.3686274509803922],
        amphibole: [0.9686274509803922, 0.615686274509804, 0.5176470588235295],
        'kaolinite-montmorillinite': [0.9333333333333333, 0.38823529411764707, 0.3215686274509804]
    }
]

const COLOR_PRESETS: Array<UnlabelledPalette> = [
    [
        [0.47058823529411764, 0.34509803921568627, 0.5882352941176471],
        [0.6705882352941176, 0.7411764705882353, 0.6862745098039216],
        [0.41568627450980394, 0.4745098039215686, 0.5764705882352941]
    ], [
        [0.3803921568627451, 0.23137254901960785, 0.35294117647058826],
        [0.5372549019607843, 0.3764705882352941, 0.5568627450980392],
        [0.7294117647058823, 0.5843137254901961, 0.5764705882352941],
        [0.9294117647058824, 0.9764705882352941, 0.6666666666666666],
        [0.7843137254901961, 0.9803921568627451, 0.7411764705882353]
    ],
    [
        [0.5843137254901961, 0.3803921568627451, 0.8862745098039215],
        [0.8901960784313725, 0.20392156862745098, 0.1843137254901961],
        [1, 0.9294117647058824, 0.2901960784313726],
        [0.9647058823529412, 0.6, 0.24705882352941178],
        [0.20392156862745098, 0.5647058823529412, 0.8627450980392157],
        [0.30196078431372547, 0.7529411764705882, 0.7098039215686275],
        [0.2196078431372549, 0.7568627450980392, 0.4470588235294118],
        [0.39215686274509803, 0.4549019607843137, 0.803921568627451],
        [0.9647058823529412, 0.42745098039215684, 0.6078431372549019]
    ]
]

export default MineralBlend

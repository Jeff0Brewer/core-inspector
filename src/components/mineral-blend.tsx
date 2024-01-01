import { useState, useRef, useEffect, useCallback, ReactElement } from 'react'
import { MdRemoveRedEye, MdColorLens } from 'react-icons/md'
import { PiCaretDownBold } from 'react-icons/pi'
import { IoCaretDownSharp } from 'react-icons/io5'
import { vec3 } from 'gl-matrix'
import { clamp, vecToHex } from '../lib/util'
import { VIS_DEFAULTS } from '../vis/vis'
import '../styles/mineral-blend.css'

type LabelledPallate = { [mineral: string]: vec3 }
type UnlabelledPallate = Array<vec3>

type MineralBlendProps = {
    minerals: Array<string>,
    currMineral: number,
    setMineral: (i: number) => void,
    setBlending: (m: Array<number>, c: Array<vec3 | null>) => void
}

function MineralBlend (
    { minerals, currMineral, setMineral, setBlending }: MineralBlendProps
): ReactElement {
    const [pallate, setPallate] = useState<LabelledPallate | UnlabelledPallate>(LABELED_ITEMS[0])
    const [visibilities, setVisibilities] = useState<Array<boolean>>(Array(minerals.length).fill(true))
    const [magnitudes, setMagnitudes] = useState<Array<number>>(
        Array(minerals.length).fill(VIS_DEFAULTS.mineral.blendMagnitude)
    )
    const [open, setOpen] = useState<boolean>(true)

    const getColor = useCallback((mineral: string, index: number): vec3 | null => {
        const isLabelled = !Array.isArray(pallate)
        let color
        if (isLabelled) {
            color = pallate[mineral] || null
        } else {
            if (visibilities[index]) {
                const ind = visibilities.slice(0, index).filter(v => v).length
                color = pallate[ind]
            } else {
                color = null
            }
        }
        return color
    }, [pallate, visibilities])

    // init visibilities on pallate change, hide minerals not present in
    // labelled keys and hide minerals not in unlabelled array bounds
    useEffect(() => {
        const isLabelled = !Array.isArray(pallate)
        const visibilities = Array(minerals.length).fill(false)
        if (isLabelled) {
            const visibleMinerals = Object.keys(pallate)
            for (let i = 0; i < minerals.length; i++) {
                const visible = visibleMinerals.indexOf(minerals[i]) !== -1
                if (visible) {
                    visibilities[i] = true
                }
            }
        } else {
            for (let i = 0; i < pallate.length; i++) {
                visibilities[i] = true
            }
        }
        setVisibilities(visibilities)
    }, [pallate, minerals])

    useEffect(() => {
        const colors = []
        for (let i = 0; i < minerals.length; i++) {
            colors.push(getColor(minerals[i], i))
        }
        setBlending(magnitudes, colors)
    }, [minerals, magnitudes, getColor, setBlending])

    // close blend menu if not currently using blended output
    useEffect(() => {
        if (currMineral >= 0) {
            setOpen(false)
        }
    }, [currMineral])

    const isLabelled = !Array.isArray(pallate)
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
                        items={LABELED_ITEMS}
                        selected={isLabelled ? pallate : null}
                        setSelected={setPallate}
                    />
                </div>
                <p>color presets</p>
                <div>
                    <ColorDropdown
                        items={ITEMS}
                        selected={!isLabelled ? pallate : null}
                        setSelected={setPallate}
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

type ColorPallateProps = {
    pallate: LabelledPallate | UnlabelledPallate
}

function ColorPallate (
    { pallate }: ColorPallateProps
): ReactElement {
    const isLabelled = !Array.isArray(pallate)
    return (
        <div className={'pallate'}>
            { isLabelled
                ? Object.entries(pallate).map(([mineral, color], i) =>
                    <ColorSwatch mineral={mineral} color={color} key={i} />)
                : pallate.map((color, i) =>
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

type ColorDropdownProps<T extends LabelledPallate | UnlabelledPallate> = {
    items: Array<T>,
    selected: T | null,
    setSelected: (s: T) => void
}

function ColorDropdown<T extends LabelledPallate | UnlabelledPallate> (
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
                        <ColorPallate pallate={selected} />}
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
                        <ColorPallate pallate={item} />
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

const ITEMS: Array<UnlabelledPallate> = [
    [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
        [1, 0, 1],
        [1, 1, 0]
    ], [
        [0.5, 0.25, 0.25],
        [0.25, 0.5, 0.25],
        [0.25, 0.25, 0.5],
        [0.5, 0.25, 0.5],
        [0.5, 0.5, 0.25]
    ]
]

const LABELED_ITEMS: Array<LabelledPallate> = [
    {
        chlorite: [1, 0, 0],
        epidote: [0, 1, 0],
        prehnite: [0, 0, 1],
        amphibole: [1, 0, 1],
        carbonate: [1, 1, 0]
    }, {
        pyroxene: [1, 0, 0],
        amphibole: [0, 1, 0],
        gypsum: [0, 0, 1],
        'kaolinite-montmorillinite': [1, 0, 1],
        zeolite: [1, 1, 0]
    }
]

export default MineralBlend

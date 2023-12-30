import { useState, useRef, useEffect, ReactElement } from 'react'
import { MdRemoveRedEye, MdColorLens } from 'react-icons/md'
import { PiCaretDownBold } from 'react-icons/pi'
import { IoCaretDownSharp } from 'react-icons/io5'
import { vec3 } from 'gl-matrix'
import { clamp, vecToHex } from '../lib/util'
import { VIS_DEFAULTS } from '../vis/vis'
import '../styles/mineral-blend.css'

type MineralColor = {
    color: vec3,
    mineral?: string
}

const ITEMS: Array<Array<MineralColor>> = [
    [
        { color: [1, 0, 0] },
        { color: [0, 1, 0] },
        { color: [0, 0, 1] },
        { color: [1, 0, 1] },
        { color: [1, 1, 0] }
    ], [
        { color: [0.5, 0.25, 0.25] },
        { color: [0.25, 0.5, 0.25] },
        { color: [0.25, 0.25, 0.5] },
        { color: [0.5, 0.25, 0.5] },
        { color: [0.5, 0.5, 0.25] }
    ]
]

type ColorDropdownProps = {
    items: Array<Array<MineralColor>>,
    setColors: (c: Array<MineralColor>) => void
}

function ColorDropdown (
    { items, setColors }: ColorDropdownProps
): ReactElement {
    const [open, setOpen] = useState<boolean>(false)

    const getColor = (swatch: MineralColor): string => {
        const colorU8 = vec3.create()
        vec3.scale(colorU8, swatch.color, 255)
        vec3.floor(colorU8, colorU8)
        const color = `#${vecToHex([...colorU8])}`
        return color
    }

    return (
        <div className={'dropdown'} data-open={open}>
            <div className={'content'}>
                <div className={'selected'}></div>
                <div className={'items'}>
                    { items.map((item, i) =>
                        <a className={'item'} key={i}>
                            { item.map((swatch, i) =>
                                <div
                                    key={i}
                                    className={'swatch'}
                                    style={{ backgroundColor: getColor(swatch) }}
                                ></div>) }
                        </a>) }
                </div>
            </div>
            <button onClick={(): void => setOpen(!open)}>
                <PiCaretDownBold />
            </button>
        </div>
    )
}

type MineralBlendProps = {
    minerals: Array<string>,
    currMineral: number,
    setMineral: (i: number) => void,
    setBlending: (i: number, m: number) => void
}

function MineralBlend (
    { minerals, currMineral, setMineral, setBlending }: MineralBlendProps
): ReactElement {
    const [open, setOpen] = useState<boolean>(true)

    // close blend menu if not currently using blended output
    useEffect(() => {
        if (currMineral >= 0) {
            setOpen(false)
        }
    }, [currMineral])

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
                    <ColorDropdown items={ITEMS} setColors={(c) => { console.log(c) }} />
                </div>
                <p>color presets</p>
                <div>
                    <ColorDropdown items={ITEMS} setColors={(c) => { console.log(c) }} />
                </div>
                <p>mineral color mixer</p>
                <div>
                    { minerals.map((name, i) => (
                        <MineralBlender
                            key={i}
                            mineral={name}
                            setBlend={(m: number) => { setBlending(i, m) }}
                        />
                    )) }
                </div>
            </section> }
        </div>
    )
}

type MineralBlenderProps = {
    mineral: string,
    setBlend: (m: number) => void
}

const formatPercent = (p: number): string => {
    return (p * 100).toFixed()
}

function MineralBlender (
    { mineral, setBlend }: MineralBlenderProps
): ReactElement {
    const [percentage, setPercentage] = useState<number>(VIS_DEFAULTS.mineral.blendMagnitude)
    const [visible, setVisible] = useState<boolean>(true)
    const [dragging, setDragging] = useState<boolean>(false)
    const sliderRef = useRef<HTMLDivElement>(null)
    const textInputRef = useRef<HTMLInputElement>(null)

    const lastValidTextRef = useRef<string>(formatPercent(percentage))
    const cleanTextTimeoutIdRef = useRef<number>(-1)

    const updatePercentageText = (): void => {
        if (!textInputRef.current) {
            throw new Error('No reference to text input element')
        }

        const value = parseFloat(textInputRef.current.value)
        if (!Number.isNaN(value) && value >= 0 && value <= 100) {
            const percentage = value * 0.01
            setPercentage(percentage)
            // store valid text input value to revert to
            // if user input invalid
            lastValidTextRef.current = formatPercent(percentage)
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

            setPercentage(clickPercentage)
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
    }, [dragging])

    useEffect(() => {
        if (visible) {
            setBlend(percentage)
        } else {
            setBlend(0)
        }
    }, [visible, percentage, setBlend])

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
                <div className={'percentage'}>
                    <input
                        ref={textInputRef}
                        type="text"
                        defaultValue={lastValidTextRef.current}
                        onInput={updatePercentageText}
                    />
                    %
                </div>
            </div>
            <div ref={sliderRef} className={'slider'}>
                <div
                    className={'arrow'}
                    style={{ left: `${percentage * 100}%` }}
                >
                    <IoCaretDownSharp />
                </div>
                <div
                    className={'value'}
                    style={{ width: `${percentage * 100}%` }}
                ></div>
            </div>
        </div>
    )
}

export default MineralBlend

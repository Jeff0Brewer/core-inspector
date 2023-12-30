import { useState, useRef, useEffect, ReactElement } from 'react'
import { MdRemoveRedEye, MdColorLens } from 'react-icons/md'
import { IoCaretDownSharp } from 'react-icons/io5'
import { clamp } from '../lib/util'
import { VIS_DEFAULTS } from '../vis/vis'
import '../styles/mineral-blend.css'

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
            textInput.value = (clickPercentage * 100).toFixed()
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
        if (!textInputRef.current) {
            throw new Error('No reference to text input element')
        }
        if (visible) {
            setBlend(percentage)
            textInputRef.current.value = formatPercent(percentage)
        } else {
            setBlend(0)
            textInputRef.current.value = '0'
        }
    }, [visible, percentage, setBlend])

    return (
        <div
            className={'mineral-blender'}
            data-visible={visible}
            data-dragging={dragging}
        >
            <div className={'mineral-blender-top'}>
                <div>
                    <a onClick={(): void => { setVisible(!visible) }}>
                        <MdRemoveRedEye />
                    </a>
                    <p>{mineral}</p>
                </div>
                <div>
                    <div className={'percentage-wrap'}>
                        <input
                            ref={textInputRef}
                            type="text"
                            defaultValue={lastValidTextRef.current}
                            onInput={updatePercentageText}
                        />
                        %
                    </div>
                </div>
            </div>
            <div ref={sliderRef} className={'slider-wrap'}>
                { dragging && <div
                    className={'slider-arrow'}
                    style={{ left: `${percentage * 100}%` }}
                >
                    <IoCaretDownSharp />
                </div> }
                <div
                    className={'slider-value'}
                    style={{ width: `${percentage * 100}%` }}
                ></div>
            </div>
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
    const [open, setOpen] = useState<boolean>(false)

    // close blend menu if not currently using blended output
    useEffect(() => {
        if (currMineral >= 0) {
            setOpen(false)
        }
    }, [currMineral])

    return (
        <div className={'blend-menu'}>
            <button
                onClick={() => {
                    setMineral(-1)
                    setOpen(!open)
                }}
                data-active={currMineral < 0}
            >
                <MdColorLens />
            </button>
            { open && <div>
                { minerals.map((name, i) => (
                    <MineralBlender
                        key={i}
                        mineral={name}
                        setBlend={(m: number) => { setBlending(i, m) }}
                    />
                )) }
            </div> }
        </div>
    )
}

export default MineralBlend

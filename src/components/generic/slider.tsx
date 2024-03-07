import { useState, useRef, useEffect, ReactElement } from 'react'
import { clamp, formatFloat, StringMap } from '../../lib/util'
import styles from '../../styles/slider.module.css'

// closure that takes slider's coordinated text input as an argument
// and returns full custom dom for slider supplemental elements
//
// affords custom feature set for different sliders with text input logic already handled
type SliderCustomElement = (textInput: ReactElement) => ReactElement

// defaults to only including text input as supplemental element
const DEFAULT_ELEMENT: SliderCustomElement = textInput => textInput

// formatter with conversion to and from string,
// used to coordinate and style text input values
type SliderTextFormatter = {
    apply: (v: number) => string,
    parse: (v: string) => number
}

const DEFAULT_FORMATTER: SliderTextFormatter = {
    apply: formatFloat,
    parse: parseFloat
}

type SliderProps = {
    value: number,
    setValue: (v: number) => void,
    min: number,
    max: number,
    customStyles?: StringMap<string>,
    customHandle?: ReactElement
    customElement?: SliderCustomElement,
    format?: SliderTextFormatter,
}

function Slider ({
    value, setValue, min, max, customStyles,
    customHandle = <></>,
    customElement = DEFAULT_ELEMENT,
    format = DEFAULT_FORMATTER
}: SliderProps): ReactElement {
    const [dragging, setDragging] = useState<boolean>(false)

    const lastValidTextRef = useRef<string>(format.apply(value))
    const validateTextTimeoutRef = useRef<number>(-1)

    const sliderRef = useRef<HTMLDivElement>(null)
    const textInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        const slider = sliderRef.current
        if (!slider) {
            throw new Error('No reference to slider element')
        }

        const updateFromMouse = (e: MouseEvent): void => {
            const { left, right } = slider.getBoundingClientRect()
            const clickPercent = clamp((e.clientX - left) / (right - left), 0, 1)
            setValue(clickPercent * (max - min) + min)
        }

        if (!dragging) {
            // if not dragging, only need event to start drag
            const mousedown = (e: MouseEvent): void => {
                updateFromMouse(e)
                setDragging(true)
            }

            slider.addEventListener('mousedown', mousedown)
            return () => {
                slider.removeEventListener('mousedown', mousedown)
            }
        } else {
            const mouseup = (): void => { setDragging(false) }
            const mouseleave = (): void => { setDragging(false) }
            const mousemove = (e: MouseEvent): void => { updateFromMouse(e) }

            // attach drag event handlers to window so that drag can extend
            // past slider's bounds once started
            window.addEventListener('mouseup', mouseup)
            window.addEventListener('mouseleave', mouseleave)
            window.addEventListener('mousemove', mousemove)
            return () => {
                window.removeEventListener('mouseup', mouseup)
                window.removeEventListener('mouseleave', mouseleave)
                window.removeEventListener('mousemove', mousemove)
            }
        }
    }, [dragging, min, max, setValue])

    // align text input value with current value on state change
    useEffect(() => {
        const textInput = textInputRef.current

        // do not update text input if currently focused
        if (!textInput || textInput === document.activeElement) {
            return
        }

        // ensure text input contains correct formatted value
        const formatted = format.apply(value)
        if (textInput.value !== formatted) {
            textInput.value = formatted
            lastValidTextRef.current = formatted
        }
    }, [value, max, min, format])

    const updateFromText = (): void => {
        if (!textInputRef.current) {
            throw new Error('No reference to text input element')
        }

        const value = format.parse(textInputRef.current.value)
        if (!Number.isNaN(value)) {
            const clamped = clamp(value, min, max)
            setValue(clamped)
            // store valid input to revert to on invalid input
            lastValidTextRef.current = format.apply(clamped)
        }

        // revert to valid text input after period of no user input
        window.clearTimeout(validateTextTimeoutRef.current)
        validateTextTimeoutRef.current = window.setTimeout(() => {
            if (textInputRef.current) {
                textInputRef.current.value = lastValidTextRef.current
            }
        }, 5000)
    }

    return (
        <div className={`${styles.slider} ${customStyles?.slider}`}>
            <div
                className={`${styles.sliderBar} ${customStyles?.sliderBar}`}
                data-dragging={dragging}
                ref={sliderRef}
            >
                <div
                    className={`${styles.sliderValue} ${customStyles?.sliderValue}`}
                    style={{ width: `${(value - min) / (max - min) * 100}%` }}
                >
                    {customHandle}
                </div>
            </div>
            <div className={`${styles.sliderElements} ${customStyles?.sliderElements}`}>
                { customElement(
                    <input
                        className={`${styles.textInput} ${customStyles?.textInput}`}
                        ref={textInputRef}
                        type={'text'}
                        onInput={updateFromText}
                        defaultValue={lastValidTextRef.current}
                    />
                ) }
            </div>
        </div>
    )
}

export default Slider

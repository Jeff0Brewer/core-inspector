import { useState, useRef, useEffect, ReactElement } from 'react'
import { clamp, formatFloat } from '../lib/util'
import '../styles/slider.css'

type SliderTextFormatter = {
    apply: (v: number) => string,
    parse: (v: string) => number
}

const DEFAULT_FORMATTER: SliderTextFormatter = {
    apply: formatFloat,
    parse: parseFloat
}

type SliderCustomElement = (textInput: ReactElement) => ReactElement

type SliderProps = {
    value: number,
    setValue: (v: number) => void,
    min: number,
    max: number,
    customElement?: SliderCustomElement,
    customHandle?: ReactElement
    format?: SliderTextFormatter,
    customClass?: string,
}

function Slider ({
    value, setValue, min, max, customElement, customHandle,
    format = DEFAULT_FORMATTER, customClass = ''
}: SliderProps): ReactElement {
    const [dragging, setDragging] = useState<boolean>(false)

    const lastValidTextRef = useRef<string>(format.apply(value))
    const validateTextTimeoutRef = useRef<number>(-1)

    const sliderRef = useRef<HTMLDivElement>(null)
    const textInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        const slider = sliderRef.current
        const textInput = textInputRef.current
        if (!slider || !textInput) {
            throw new Error('No reference to input elements')
        }

        const updateFromMouse = (e: MouseEvent): void => {
            const { left, right } = slider.getBoundingClientRect()
            const clickPercent = clamp((e.clientX - left) / (right - left), 0, 1)
            const value = clickPercent * (max - min) + min
            setValue(value)
        }

        if (!dragging) {
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

    // update text input value when value state changes
    useEffect(() => {
        const textInput = textInputRef.current

        // do not update text input if currently focused
        if (!textInput || textInput === document.activeElement) {
            return
        }

        if (format.parse(textInput.value) !== value) {
            const formatted = format.apply(value)
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

    // store text input here to conditionally pass into custom element
    const textInput = (
        <input
            ref={textInputRef}
            className={'text-input'}
            type={'text'}
            onInput={updateFromText}
            defaultValue={lastValidTextRef.current}
        />

    )

    return (
        <div className={`slider-wrap ${customClass}`}>
            <div
                className={'slider-bar'}
                data-dragging={dragging}
                ref={sliderRef}
            >
                <div
                    className={'slider-value'}
                    style={{ width: `${(value - min) / (max - min) * 100}%` }}
                >
                    {customHandle !== undefined && customHandle}
                </div>
            </div>
            <div className={'slider-elements'}>
                { customElement !== undefined
                    ? customElement(textInput)
                    : textInput }
            </div>
        </div>
    )
}

export default Slider

import React, { useState, useRef, useEffect, ReactElement } from 'react'
import { clamp, formatFloat } from '../lib/util'
import '../styles/slider.css'

type SliderTextFormatter = {
    render: (v: number) => string,
    parse: (v: string) => number
}

const DEFAULT_FORMATTER: SliderTextFormatter = {
    render: formatFloat,
    parse: parseFloat
}

type SliderCustomElements = (textInput: ReactElement) => Array<ReactElement>

type SliderProps = {
    value: number,
    setValue: (v: number) => void,
    min: number,
    max: number,
    format?: SliderTextFormatter
    customClass?: string,
    customElements?: SliderCustomElements,
}

function Slider (
    { value, setValue, min, max, format = DEFAULT_FORMATTER, customClass = '', customElements }: SliderProps
): ReactElement {
    const [dragging, setDragging] = useState<boolean>(false)

    const lastValidTextRef = useRef<string>(format.render(value))
    const validateTextTimeoutRef = useRef<number>(-1)

    const sliderRef = useRef<HTMLDivElement>(null)
    const textInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (value > max || value < min) {
            throw new Error('Value set outside input bounds')
        }
        const textInput = textInputRef.current
        // do not update text input value if currently focused
        if (!textInput || textInput === document.activeElement) {
            return
        }
        if (format.parse(textInput.value) !== value) {
            const formatted = format.render(value)
            textInput.value = formatted
            lastValidTextRef.current = formatted
        }
    }, [value, max, min, format])

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

    const updateFromText = (): void => {
        if (!textInputRef.current) {
            throw new Error('No reference to text input element')
        }

        // set current value if input text is valid number
        const value = format.parse(textInputRef.current.value)
        if (!Number.isNaN(value)) {
            const clamped = clamp(value, min, max)
            setValue(clamped)
            // store valid input to revert to on invalid input
            lastValidTextRef.current = format.render(clamped)
        }

        // revert to valid text input after period of no user input
        window.clearTimeout(validateTextTimeoutRef.current)
        validateTextTimeoutRef.current = window.setTimeout(() => {
            if (textInputRef.current) {
                textInputRef.current.value = lastValidTextRef.current
            }
        }, 5000)
    }

    const getTextInputElement = (): ReactElement => {
        return <input
            ref={textInputRef}
            className={'text-input'}
            type={'text'}
            onInput={updateFromText}
            defaultValue={lastValidTextRef.current}
        />
    }

    return (
        <div className={`slider-wrap ${customClass}`}>
            <div
                ref={sliderRef}
                className={'slider-bar'}
                data-dragging={dragging}
            >
                <div
                    className={'slider-value'}
                    style={{ width: `${(value - min) / (max - min) * 100}%` }}
                ></div>
            </div>
            <div className={'slider-elements'}>
                { customElements
                    ? customElements(getTextInputElement()).map((element, i) =>
                        <React.Fragment key={i}>
                            {element}
                        </React.Fragment>
                    )
                    : getTextInputElement() }
            </div>
        </div>
    )
}

export default Slider

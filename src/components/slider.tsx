import { useState, useRef, useEffect, ReactElement } from 'react'
import { clamp, formatFloat } from '../lib/util'
import '../styles/slider.css'

type SliderProps = {
    value: number,
    setValue: (v: number) => void,
    min: number,
    max: number,
    formatValue?: (v: number) => string,
    customClass?: string,
    beforeElements?: Array<ReactElement>
    afterElements?: Array<ReactElement>
}

function Slider (
    { value, setValue, min, max, formatValue = formatFloat, customClass = '', beforeElements, afterElements }: SliderProps
): ReactElement {
    const [dragging, setDragging] = useState<boolean>(false)

    const lastValidTextRef = useRef<string>(formatValue(value))
    const validateTextTimeoutRef = useRef<number>(-1)

    const sliderRef = useRef<HTMLDivElement>(null)
    const textInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => { console.log(value) }, [value])

    useEffect(() => {
        if (value > max || value < min) {
            throw new Error('Value set outside input bounds')
        }
        const textInput = textInputRef.current
        // do not update text input value if currently focused
        if (!textInput || textInput === document.activeElement) {
            return
        }
        if (textInput.valueAsNumber !== value) {
            const formatted = formatValue(value)
            textInput.value = formatted
            lastValidTextRef.current = formatted
        }
    }, [value, max, min, formatValue])

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
    }, [dragging, min, max, setValue, formatValue])

    const updateFromText = (): void => {
        if (!textInputRef.current) {
            throw new Error('No reference to text input element')
        }

        // set current value if input text is valid number
        const value = parseFloat(textInputRef.current.value)
        if (!Number.isNaN(value)) {
            const clamped = clamp(value, min, max)
            setValue(clamped)
            // store valid input to revert to on invalid input
            lastValidTextRef.current = formatValue(clamped)
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
        <div className={`slider-wrap ${customClass}`}>
            { beforeElements && beforeElements.map(el => el) }
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
            <input
                ref={textInputRef}
                className={'text-input'}
                type={'text'}
                onInput={updateFromText}
                defaultValue={lastValidTextRef.current}
            />
            { afterElements && afterElements.map(el => el) }
        </div>
    )
}

export default Slider

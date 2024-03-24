import React, { useEffect, useRef, ReactElement } from 'react'
import styles from '../../styles/generic/vertical-slider.module.css'

type VerticalSliderProps = {
    value: number,
    setValue: (v: number) => void,
    height?: string,
    label?: string,
    icon?: ReactElement,
    min?: number,
    max?: number,
    step?: number
}

function VerticalSlider ({
    value, setValue, label, icon,
    height = '80px',
    min = 0,
    max = 1,
    step = 0.1
}: VerticalSliderProps): ReactElement {
    const inputRef = useRef<HTMLInputElement>(null)

    // update input element if value changed external to this component
    useEffect(() => {
        const input = inputRef.current
        if (!input) {
            throw new Error('No reference to range input')
        }

        // only update input if current input value is different from state
        if (Math.abs(value - input.valueAsNumber) >= step) {
            input.valueAsNumber = value
        }
    }, [value, step])

    // cast required to set css variable
    const heightStyle = { '--height': height } as React.CSSProperties

    return (
        <div className={styles.wrap} style={heightStyle}>
            <input
                className={styles.slider}
                ref={inputRef}
                type={'range'}
                defaultValue={value}
                min={min}
                max={max}
                step={step}
                onChange={e => setValue(e.target.valueAsNumber)}
            />
            { label && <p className={styles.label}>{label}</p> }
            { icon && <div className={styles.icon}>{icon}</div> }
        </div>
    )
}

export default VerticalSlider

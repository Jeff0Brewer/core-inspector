import { useEffect, useRef, ReactElement } from 'react'
import '../styles/vertical-slider.css'

const DEFAULT_MIN = 0
const DEFAULT_MAX = 1
const DEFAULT_STEP = 0.1
const EPSILON = 0.00001

type VerticalSliderProps = {
    currValue: number,
    setValue: (v: number) => void,
    min?: number,
    max?: number,
    step?: number,
    label?: string,
    icon?: ReactElement
}

function VerticalSlider (
    { currValue, setValue, min, max, step, label, icon }: VerticalSliderProps
): ReactElement {
    const inputRef = useRef<HTMLInputElement>(null)

    // update input element if value changed external to this component
    useEffect(() => {
        if (!inputRef.current) { return }

        const valueDiff = Math.abs(currValue - inputRef.current.valueAsNumber)
        if (valueDiff > EPSILON) {
            inputRef.current.valueAsNumber = currValue
        }
    }, [currValue])

    return (
        <div className={'vertical-slider'}>
            <input
                ref={inputRef}
                type={'range'}
                defaultValue={currValue}
                onChange={e => setValue(e.target.valueAsNumber)}
                min={min || DEFAULT_MIN}
                max={max || DEFAULT_MAX}
                step={step || DEFAULT_STEP}
            />
            { label && <p>{label}</p> }
            { icon && <div>{icon}</div> }
        </div>
    )
}

export default VerticalSlider

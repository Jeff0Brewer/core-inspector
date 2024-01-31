import { ReactElement } from 'react'
import '../../styles/toggle-button.css'

type ToggleButtonProps = {
    currValue: boolean,
    setValue: (v: boolean) => void,
    icon: ReactElement
}

function ToggleButton (
    { currValue, setValue, icon }: ToggleButtonProps
): ReactElement {
    return (
        <button
            className={'toggle-button'}
            data-active={currValue}
            onClick={() => setValue(!currValue)}
        >
            {icon}
        </button>
    )
}

export default ToggleButton

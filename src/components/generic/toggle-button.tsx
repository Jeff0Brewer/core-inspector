import { ReactElement } from 'react'
import '../../styles/toggle-button.css'

type ToggleButtonProps = {
    active: boolean,
    toggleValue: () => void,
    icon: ReactElement
}

function ToggleButton (
    { active, toggleValue, icon }: ToggleButtonProps
): ReactElement {
    return (
        <button
            className={'toggle-button'}
            data-active={active}
            onClick={toggleValue}
        >
            {icon}
        </button>
    )
}

export default ToggleButton

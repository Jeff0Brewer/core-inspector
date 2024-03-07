import { ReactElement } from 'react'
import styles from '../../styles/toggle-button.module.css'

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
            onClick={toggleValue}
            className={styles.toggleButton}
            data-active={active}
        >
            {icon}
        </button>
    )
}

export default ToggleButton

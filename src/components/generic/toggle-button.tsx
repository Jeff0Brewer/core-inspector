import { ReactElement } from 'react'
import styles from '../../styles/generic/toggle-button.module.css'

type ToggleButtonProps = {
    active: boolean,
    toggleValue: () => void,
    icon: ReactElement,
    label?: string
}

function ToggleButton (
    { active, toggleValue, icon, label }: ToggleButtonProps
): ReactElement {
    return (
        <div className={styles.toggleButton}>
            <button
                onClick={toggleValue}
                data-active={active}
            >
                {icon}
            </button>
            { label &&
                <p className={styles.label}>
                    {label}
                </p>}
        </div>
    )
}

export default ToggleButton

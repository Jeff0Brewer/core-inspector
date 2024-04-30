import { ReactElement } from 'react'
import styles from '../../styles/generic/toggle-select.module.css'

type ToggleItem<T> = {
    value: T,
    icon: ReactElement
}

type ToggleSelectProps<T> = {
    currValue: T,
    setValue: (v: T) => void,
    item0: ToggleItem<T>,
    item1: ToggleItem<T>,
    label?: string
}

function ToggleSelect<T> (
    { currValue, setValue, item0, item1, label }: ToggleSelectProps<T>
): ReactElement {
    return (
        <div className={styles.toggleSelect}>
            <div className={styles.options}>
                <button
                    className={styles.toggleButton}
                    data-active={currValue === item0.value}
                    onClick={() => setValue(item0.value)}
                >
                    {item0.icon}
                </button>
                <button
                    className={styles.toggleButton}
                    data-active={currValue === item1.value}
                    onClick={() => setValue(item1.value)}
                >
                    {item1.icon}
                </button>
            </div>
            { label &&
                <p className={styles.label}>
                    {label}
                </p> }
        </div>
    )
}

export default ToggleSelect

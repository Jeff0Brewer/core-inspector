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
}

function ToggleSelect<T> (
    { currValue, setValue, item0, item1 }: ToggleSelectProps<T>
): ReactElement {
    return (
        <div className={styles.toggleSelect}>
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
    )
}

export default ToggleSelect

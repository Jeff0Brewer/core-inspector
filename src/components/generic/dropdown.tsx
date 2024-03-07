import { useState, ReactElement } from 'react'
import { PiCaretDownBold } from 'react-icons/pi'
import { checkStringType, StringMap } from '../../lib/util'
import styles from '../../styles/generic/dropdown.module.css'

// default item renderer for dropdown
// uses generic type for flexibility but must be castable to string
type StringItemProps<T> = {
    item: T
}

function StringItem<T> (
    { item }: StringItemProps<T>
): ReactElement {
    return (
        <p className={styles.stringItem}>
            {checkStringType(item)}
        </p>
    )
}

type DropdownProps<T> = {
    items: Array<T>,
    selected: T | null,
    setSelected: (s: T) => void,
    customStyles?: StringMap<string>,
    Element?: (props: { item: T }) => ReactElement
}

function Dropdown<T> ({
    items, selected, setSelected, customStyles,
    Element = StringItem
}: DropdownProps<T>): ReactElement {
    const [open, setOpen] = useState<boolean>(false)

    return (
        <div
            className={`${styles.dropdown} ${customStyles?.dropdown}`}
            data-open={open}
            data-selected={!!selected}
        >
            <div
                className={`${styles.dropdownLabel} ${customStyles?.dropdownLabel}`}
                onClick={() => setOpen(!open)}
            >
                <div className={`${styles.dropdownSelected} ${customStyles?.dropdownSelected}`}>
                    { selected && <Element item={selected} />}
                </div>
                <button>
                    <PiCaretDownBold />
                </button>
            </div>
            <div className={`${styles.dropdownItems} ${customStyles?.dropdownItems}`}>
                { items.map((item, i) =>
                    <a key={i} onClick={() => {
                        setSelected(item)
                        setOpen(false)
                    }}>
                        { <Element item={item} /> }
                    </a>) }
            </div>
        </div>
    )
}

export default Dropdown

import { useState, ReactElement } from 'react'
import { PiCaretDownBold } from 'react-icons/pi'
import { checkStringType } from '../../lib/util'
import '../../styles/dropdown.css'

// default item renderer for dropdown
// uses generic type for flexibility but must be castable to string
type StringItemProps<T> = {
    item: T
}

function StringItem<T> (
    { item }: StringItemProps<T>
): ReactElement {
    return (
        <p className={'string-item'}>
            {checkStringType(item)}
        </p>
    )
}

type DropdownProps<T> = {
    items: Array<T>,
    selected: T | null,
    setSelected: (s: T) => void,
    Element?: (props: { item: T }) => ReactElement,
    customClass?: string
}

function Dropdown<T> ({
    items, selected, setSelected,
    Element = StringItem,
    customClass = ''
}: DropdownProps<T>): ReactElement {
    const [open, setOpen] = useState<boolean>(false)

    return (
        <div
            className={`generic-dropdown ${customClass}`}
            data-open={open}
            data-selected={!!selected}
        >
            <div className={'label'} onClick={() => setOpen(!open)}>
                <div className={'selected'}>
                    { selected && <Element item={selected} />}
                </div>
                <button>
                    <PiCaretDownBold />
                </button>
            </div>
            <div className={'items'}>
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

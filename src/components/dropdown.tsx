import { useState, ReactElement, ReactPortal } from 'react'
import { PiCaretDownBold } from 'react-icons/pi'
import '../styles/dropdown.css'

function checkStringType (v: unknown): string {
    const vType = typeof v
    if (vType !== 'string') {
        throw new Error(`Expected type string, got ${vType}`)
    }
    return v as 'string'
}

type StringItemProps<T> = {
    item: T
}

function StringItem<T> (
    { item }: StringItemProps<T>
): ReactElement {
    return (
        <p>{checkStringType(item)}</p>
    )
}

type DropdownProps<T> = {
    items: Array<T>,
    selected: T | null,
    setSelected: (s: T) => void,
    Element?: (props: { item: T }) => ReactElement,
    customClass?: string
}

function Dropdown<T> (
    { items, Element, selected, setSelected, customClass }: DropdownProps<T>
): ReactElement {
    const [open, setOpen] = useState<boolean>(false)

    if (!Element) {
        Element = StringItem
    }

    return (
        <div
            className={`generic-dropdown ${customClass || ''}`}
            data-open={open}
            data-selected={!!selected}
        >
            <div className={'label'}>
                <div className={'selected'}>
                    { selected && <Element item={selected} />}
                </div>
                <button onClick={() => setOpen(!open)}>
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

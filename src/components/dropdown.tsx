import { useState, ReactElement } from 'react'
import { PiCaretDownBold } from 'react-icons/pi'

type DropdownProps<T> = {
    items: Array<T>,
    selected: T | null,
    setSelected: (s: T) => void,
    Element: (props: { item: T }) => ReactElement,
    wrapClass?: string,
    labelClass?: string,
    itemsClass?: string
}

function Dropdown<T> (
    { items, Element, selected, setSelected, wrapClass, labelClass, itemsClass }: DropdownProps<T>
): ReactElement {
    const [open, setOpen] = useState<boolean>(false)

    return (
        <div
            className={`dropdown ${wrapClass || ''}`}
            data-open={open}
            data-selected={!!selected}
        >
            <div className={`label ${labelClass || ''}`}>
                <div className={'selected'}>
                    { selected && <Element item={selected} />}
                </div>
                <button onClick={() => setOpen(!open)}>
                    <PiCaretDownBold />
                </button>
            </div>
            <div className={`items ${itemsClass || ''}`}>
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

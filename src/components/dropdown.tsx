import { useState, ReactElement } from 'react'
import { PiCaretDownBold } from 'react-icons/pi'
import '../styles/dropdown.css'

type DropdownProps<T> = {
    items: Array<T>,
    selected: T | null,
    setSelected: (s: T) => void,
    Element: (props: { item: T }) => ReactElement,
    customClass?: string
}

function Dropdown<T> (
    { items, Element, selected, setSelected, customClass }: DropdownProps<T>
): ReactElement {
    const [open, setOpen] = useState<boolean>(false)

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

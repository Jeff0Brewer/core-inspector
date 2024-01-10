import { ReactElement } from 'react'
import Dropdown from '../components/dropdown'
import '../styles/core-select.css'

type CoreSelectProps = {
    cores: Array<string>,
    selected: string,
    setSelected: (c: string) => void
}

function CoreSelect (
    { cores, selected, setSelected }: CoreSelectProps
): ReactElement {
    return (
        <div className={'core-select'}>
            <p>core</p>
            <Dropdown
                items={cores}
                selected={selected}
                setSelected={setSelected}
                customClass={'core-dropdown'}
            />
        </div>
    )
}

export default CoreSelect

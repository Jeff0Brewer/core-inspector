import { ReactElement } from 'react'
import Dropdown from '../components/dropdown'

type CoreSelectProps = {
    cores: Array<string>,
    selected: string,
    setSelected: (c: string) => void
}

function CoreSelect (
    { cores, selected, setSelected }: CoreSelectProps
): ReactElement {
    return (
        <div>
            <p>core</p>
            <Dropdown
                items={cores}
                selected={selected}
                setSelected={setSelected}
            />
        </div>
    )
}

export default CoreSelect

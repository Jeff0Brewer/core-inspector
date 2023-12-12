import { ReactElement } from 'react'
import '../styles/mineral-select.css'

type MineralSelectProps = {
    minerals: Array<string>,
    currMineral: number,
    setMineral: (i: number) => void
}

function MineralSelect (
    { minerals, currMineral, setMineral }: MineralSelectProps
): ReactElement {
    return (
        <div className={'mineral-select'}>
            { minerals.map((name, i) => (
                <button
                    onClick={() => setMineral(i)}
                    data-active={i === currMineral}
                    key={i}
                >
                    {name}
                </button>
            )) }
        </div>
    )
}

export default MineralSelect

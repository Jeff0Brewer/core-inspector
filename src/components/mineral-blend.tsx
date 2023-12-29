import { useState, useEffect, ReactElement } from 'react'
import { MdColorLens } from 'react-icons/md'
import '../styles/mineral-blend.css'

type MineralBlendProps = {
    minerals: Array<string>,
    currMineral: number,
    setMineral: (i: number) => void,
    setBlending: (m: Array<number>) => void
}

function MineralBlend (
    { minerals, currMineral, setMineral, setBlending }: MineralBlendProps
): ReactElement {
    const [open, setOpen] = useState<boolean>(false)
    const [mags, setMags] = useState<Array<number>>(Array(minerals.length).fill(1))

    // close blend menu if not currently using blended output
    useEffect(() => {
        if (currMineral >= 0) {
            setOpen(false)
        }
    }, [currMineral])

    return (
        <div className={'blend-menu'}>
            <button
                onClick={() => {
                    setMineral(-1)
                    setOpen(!open)
                }}
                data-active={currMineral < 0}
            >
                <MdColorLens />
            </button>
            { open && <div>
                { minerals.map((name, i) => (
                    <div key={i}>
                        <p>{name}</p>
                        <input
                            type={'range'}
                            min={0}
                            max={1}
                            step={0.01}
                            defaultValue={mags[i]}
                            onChange={e => {
                                mags[i] = e.target.valueAsNumber
                                setMags([...mags])
                                setBlending(mags)
                            }}
                        />
                    </div>
                )) }
            </div> }
        </div>
    )
}

export default MineralBlend

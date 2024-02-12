import { useState, ReactElement } from 'react'
import { MdColorLens } from 'react-icons/md'
import { StringMap } from '../../lib/util'
import { GenericPalette } from '../../lib/palettes'
import BlendMenu from '../../components/blend-menu'

type PartMineralControlsProps = {
    minerals: Array<string>,
    palettes: Array<GenericPalette>,
    visible: StringMap<boolean>,
    setVisible: (v: StringMap<boolean>) => void,
}

function PartMineralControls (
    { minerals, palettes, visible, setVisible }: PartMineralControlsProps
): ReactElement {
    const [menuOpen, setMenuOpen] = useState<boolean>(false)

    const toggleMineralVisible = (mineral: string): void => {
        visible[mineral] = !visible[mineral]
        setVisible({ ...visible })
    }

    return (
        <div className={'mineral-controls'}>
            <div className={'mineral-toggles'}>
                { minerals.map((mineral, i) =>
                    <button
                        onClick={() => toggleMineralVisible(mineral)}
                        data-active={visible[mineral]}
                        key={i}
                    >
                        {mineral}
                    </button>
                ) }
            </div>
            <button
                className={'blend-toggle'}
                onClick={() => setMenuOpen(!menuOpen)}
                data-active={menuOpen}
            >
                <MdColorLens />
            </button>
            { menuOpen && <BlendMenu minerals={minerals} palettes={palettes} /> }
        </div>
    )
}

export default PartMineralControls

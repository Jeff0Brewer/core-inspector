import { useState, ReactElement } from 'react'
import { MdColorLens } from 'react-icons/md'
import { StringMap } from '../../lib/util'
import { GenericPalette } from '../../lib/palettes'
import BlendMenu from '../../components/blend-menu'
import styles from '../../styles/part/mineral-controls.module.css'

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
        <div className={styles.mineralControls}>
            <div className={styles.toggles}>
                { minerals.map((mineral, i) =>
                    <button
                        className={styles.mineralToggle}
                        onClick={() => toggleMineralVisible(mineral)}
                        data-active={visible[mineral]}
                        key={i}
                    >
                        {mineral}
                    </button>
                ) }
            </div>
            <button
                className={styles.blendToggle}
                onClick={() => setMenuOpen(!menuOpen)}
                data-active={menuOpen}
            >
                <MdColorLens />
            </button>
            <BlendMenu
                open={menuOpen}
                minerals={minerals}
                palettes={palettes}
            />
        </div>
    )
}

export default PartMineralControls

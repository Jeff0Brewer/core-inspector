import { useState, ReactElement } from 'react'
import { MdColorLens } from 'react-icons/md'
import { GenericPalette } from '../../lib/palettes'
import BlendMenu from '../../components/blend-menu'
import styles from '../../styles/part/mineral-controls.module.css'

type PartMineralControlsProps = {
    minerals: Array<string>,
    palettes: Array<GenericPalette>
}

function PartMineralControls (
    { minerals, palettes }: PartMineralControlsProps
): ReactElement {
    const [menuOpen, setMenuOpen] = useState<boolean>(false)

    return (
        <div className={styles.mineralControls}>
            <div className={styles.toggles}>
                { minerals.map((mineral, i) =>
                    <button
                        className={styles.mineralToggle}
                        data-active={true /* TODO: add functionality */}
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

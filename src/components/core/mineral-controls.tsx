import { useState, MouseEvent, ReactElement } from 'react'
import { MdColorLens } from 'react-icons/md'
import { useBlendState, useBlending } from '../../hooks/blend-context'
import { isToggleable } from '../../vis/mineral-blend'
import { GenericPalette } from '../../lib/palettes'
import BlendMenu from '../../components/blend-menu'
import CoreRenderer from '../../vis/core'
import styles from '../../styles/core/mineral-controls.module.css'

type MineralControlsProps = {
    vis: CoreRenderer | null,
    minerals: Array<string>,
    palettes: Array<GenericPalette>
}

function MineralControls (
    { vis, minerals, palettes }: MineralControlsProps
): ReactElement {
    const [menuOpen, setMenuOpen] = useState<boolean>(false)
    const {
        palette,
        visibilities,
        setVisibilities,
        setMonochrome
    } = useBlendState()

    useBlending(vis)

    const onMineralButtonClick = (e: MouseEvent, mineral: string): void => {
        if (e.shiftKey) {
            visibilities[mineral] = !visibilities[mineral]
        } else {
            minerals.forEach(mineral => {
                visibilities[mineral] = false
            })
            visibilities[mineral] = true
            setMonochrome(true)
        }
        setVisibilities({ ...visibilities })
    }

    return (
        <div className={styles.mineralControls}>
            <div className={styles.mineralBar}>
                <div className={styles.minerals}>
                    { minerals.map((mineral, i) =>
                        <button
                            className={`${!isToggleable(mineral, palette, visibilities) && styles.disabled}`}
                            onClick={(e): void => onMineralButtonClick(e, mineral)}
                            data-active={visibilities[mineral]}
                            key={i}
                        >
                            {mineral}
                        </button>
                    ) }
                </div>
                <button
                    className={styles.blendMenuToggle}
                    data-active={menuOpen}
                    onClick={() => setMenuOpen(!menuOpen)}
                >
                    <MdColorLens />
                </button>
            </div>
            <BlendMenu
                open={menuOpen}
                minerals={minerals}
                palettes={palettes}
            />
        </div>
    )
}

export default MineralControls

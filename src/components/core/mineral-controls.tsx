import { useState, MouseEvent, ReactElement } from 'react'
import { MdColorLens } from 'react-icons/md'
import { useBlendState, useBlending } from '../../hooks/blend-context'
import { getToggleableMinerals } from '../../vis/mineral-blend'
import { GenericPalette } from '../../lib/palettes'
import BlendMenu from '../../components/blend-menu'
import CoreRenderer from '../../vis/core'
import styles from '../../styles/core/mineral-controls.module.css'

type CoreMineralControlsProps = {
    vis: CoreRenderer | null,
    minerals: Array<string>,
    palettes: Array<GenericPalette>
}

function CoreMineralControls (
    { vis, minerals, palettes }: CoreMineralControlsProps
): ReactElement {
    const [menuOpen, setMenuOpen] = useState<boolean>(false)
    const {
        palette,
        visibilities,
        setVisibilities,
        setMonochrome
    } = useBlendState()

    useBlending(vis)

    const onMineralButtonClick = (e: MouseEvent, i: number): void => {
        if (e.shiftKey) {
            visibilities[i] = !visibilities[i]
        } else {
            visibilities.fill(false)
            visibilities[i] = true
            setMonochrome(true)
        }
        setVisibilities([...visibilities])
    }

    const toggleable = getToggleableMinerals(minerals, palette, visibilities)

    return (
        <div className={styles.mineralControls}>
            <div className={styles.mineralBar}>
                <div className={styles.minerals}>
                    { minerals.map((mineral, i) =>
                        <button
                            className={`${!toggleable.includes(mineral) && styles.disabled}`}
                            onClick={(e): void => onMineralButtonClick(e, i)}
                            data-active={visibilities[i]}
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

export default CoreMineralControls

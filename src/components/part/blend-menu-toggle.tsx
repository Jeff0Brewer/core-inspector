import { ReactElement, useState } from 'react'
import { MdColorLens } from 'react-icons/md'
import { GenericPalette } from '../../lib/palettes'
import BlendMenu from '../../components/blend-menu'
import styles from '../../styles/part/blend-menu-toggle.module.css'

type BlendMenuToggleProps = {
    minerals: Array<string>,
    palettes: Array<GenericPalette>
}

function BlendMenuToggle (
    { minerals, palettes }: BlendMenuToggleProps
): ReactElement {
    const [open, setOpen] = useState<boolean>(false)

    return (
        <div className={styles.wrap}>
            <button
                className={styles.blendToggle}
                onClick={() => setOpen(!open)}
                data-active={open}
            >
                <MdColorLens />
            </button>
            <BlendMenu
                open={open}
                minerals={minerals}
                palettes={palettes}
            />
        </div>
    )
}

export default BlendMenuToggle

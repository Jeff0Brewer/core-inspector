import React, { useState, useRef, ReactElement } from 'react'
import { MdColorLens } from 'react-icons/md'
import { useBlendState, useBlending } from '../../hooks/blend-context'
import { isToggleable, BlendParams } from '../../vis/mineral-blend'
import { GenericPalette } from '../../lib/palettes'
import BlendMenu from '../../components/blend-menu'
import CoreRenderer from '../../vis/core'
import styles from '../../styles/core/mineral-controls.module.css'

type MineralControlsProps = {
    vis: CoreRenderer | null,
    minerals: Array<string>,
    palettes: Array<GenericPalette>
}

const MineralControls = React.memo((
    { vis, minerals, palettes }: MineralControlsProps
): ReactElement => {
    const [menuOpen, setMenuOpen] = useState<boolean>(false)
    const {
        magnitudes,
        visibilities,
        palette,
        saturation,
        threshold,
        mode,
        monochrome,
        setVisibilities,
        setMagnitudes,
        setMonochrome,
        setSaturation,
        setThreshold,
        setBlendParams
    } = useBlendState()

    const lastBlendParams = useRef<BlendParams>({
        magnitudes, visibilities, palette, saturation, threshold, mode, monochrome
    })

    useBlending(vis)

    const numVisible = Object.values(visibilities).filter(v => v).length

    const viewSingleChannelMonochrome = (mineral: string): void => {
        if (!monochrome && numVisible > 1) {
            // store last blend state to revert to on exit monochrome view
            lastBlendParams.current = {
                magnitudes: { ...magnitudes },
                visibilities: { ...visibilities },
                palette: { ...palette },
                saturation,
                threshold,
                mode,
                monochrome
            }
        }

        minerals.forEach(mineral => {
            visibilities[mineral] = false
        })
        visibilities[mineral] = true
        magnitudes[mineral] = 1
        setVisibilities({ ...visibilities })
        setMagnitudes({ ...magnitudes })
        setMonochrome(true)
        setSaturation(1)
        setThreshold(0)
        setMenuOpen(false)
    }

    const viewBlended = (): void => {
        setBlendParams({ ...lastBlendParams.current })
        if (monochrome) {
            setMenuOpen(true)
        } else {
            setMenuOpen(!menuOpen)
        }
    }

    return (
        <div className={styles.mineralControls}>
            <div className={styles.mineralBar}>
                <div className={styles.minerals}>
                    <button
                        onClick={viewBlended}
                        data-active={numVisible > 1}
                    >
                        channel mixer
                    </button>
                    { minerals.map((mineral, i) =>
                        <button
                            className={`${!isToggleable(mineral, palette, visibilities) && styles.disabled}`}
                            onClick={() => viewSingleChannelMonochrome(mineral)}
                            data-active={numVisible === 1 && visibilities[mineral]}
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
})

export default MineralControls

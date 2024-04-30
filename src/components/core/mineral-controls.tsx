import React, { useState, useRef, ReactElement } from 'react'
import { useBlendState, useBlending } from '../../hooks/blend-context'
import { isToggleable, BlendParams } from '../../vis/mineral-blend'
import { getCssColor } from '../../lib/util'
import { GenericPalette } from '../../lib/palettes'
import BlendIcon from '../../assets/blend-icon.svg'
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

    // apply blending on changes to blend params
    useBlending(vis)

    // store last multi-channel blend state to revert to on exit monochrome view
    const lastBlendParams = useRef<BlendParams>({
        magnitudes, visibilities, palette, saturation, threshold, mode, monochrome
    })

    const numVisible = Object.values(visibilities).filter(v => v).length

    const viewSingleChannelMonochrome = (mineral: string): void => {
        if (!monochrome && numVisible > 1) {
            // copy blend values to prevent mutation via reference
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

        minerals.forEach(mineral => { visibilities[mineral] = false })
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
        // revert to last multi channel blend state if currently in single
        if (numVisible === 1) {
            setBlendParams({ ...lastBlendParams.current })
        }
        if (monochrome) {
            setMenuOpen(true)
        } else {
            setMenuOpen(!menuOpen)
        }
    }

    const paletteColors = Object.values(palette.colors)
    paletteColors.push(...Array(minerals.length - paletteColors.length).fill(null))

    return (
        <div className={styles.mineralControls}>
            <div className={styles.mineralBar}>
                <div className={styles.minerals}>
                    <button
                        className={styles.mixerButton}
                        onClick={viewBlended}
                        data-active={numVisible > 1}
                    >
                        <img src={BlendIcon} />
                        channel mixer
                        <span className={styles.mixerColors}>
                            { paletteColors.map((color, i) =>
                                <span
                                    className={color === null ? styles.swatchHidden : ''}
                                    style={{
                                        backgroundColor: getCssColor(color),
                                        zIndex: 10 - i
                                    }}
                                    key={i}
                                ></span>
                            ) }
                        </span>
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
                    <img src={BlendIcon} />
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

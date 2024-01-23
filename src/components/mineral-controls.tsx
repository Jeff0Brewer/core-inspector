import { useState, useEffect, ReactElement } from 'react'
import { MdColorLens } from 'react-icons/md'
import BlendMenu from '../components/blend-menu'
import { GenericPalette, BlendMode, MINERALS, COLOR_PRESETS } from '../vis/mineral-blend'
import VisRenderer from '../vis/vis'
import '../styles/mineral-controls.css'

type MineralControlsProps = {
    vis: VisRenderer | null
}

function MineralControls (
    { vis }: MineralControlsProps
): ReactElement {
    const [palette, setPalette] = useState<GenericPalette>(COLOR_PRESETS[0])
    const [magnitudes, setMagnitudes] = useState<Array<number>>(Array(MINERALS.length).fill(1))
    const [visibilities, setVisibilities] = useState<Array<boolean>>(Array(MINERALS.length).fill(true))
    const [saturation, setSaturation] = useState<number>(1)
    const [threshold, setThreshold] = useState<number>(0)
    const [blendMode, setBlendMode] = useState<BlendMode>('additive')
    const [monochrome, setMonochrome] = useState<boolean>(false)
    const [menuOpen, setMenuOpen] = useState<boolean>(false)

    useEffect(() => {
        vis?.setBlending({
            palette,
            magnitudes,
            visibilities,
            saturation,
            threshold,
            mode: blendMode,
            monochrome
        })
    }, [vis, magnitudes, visibilities, palette, saturation, threshold, blendMode, monochrome])

    // setup keyboard shortcuts
    useEffect(() => {
        const keydown = (e: KeyboardEvent): void => {
            if (e.key === 'b') {
                setMonochrome(!monochrome)
            } else {
                const numKey = parseInt(e.key)
                if (numKey > 0 && numKey <= MINERALS.length) {
                    visibilities[numKey - 1] = !visibilities[numKey - 1]
                    setVisibilities([...visibilities])
                }
            }
        }
        window.addEventListener('keydown', keydown)
        return () => {
            window.removeEventListener('keydown', keydown)
        }
    }, [monochrome, visibilities])

    // update visibilities to match newly selected palette on change
    useEffect(() => {
        if (palette.type === 'labelled') {
            const visibleMinerals = Object.keys(palette.colors)
            setVisibilities(MINERALS.map(mineral => visibleMinerals.includes(mineral)))
        } else {
            const numVisible = palette.colors.length
            setVisibilities(MINERALS.map((_, i) => i < numVisible))
        }
    }, [palette, vis])

    // sets parameters to show one channel in monochrome
    const getMineralSetter = (i: number): (() => void) => {
        return () => {
            visibilities.fill(false)
            visibilities[i] = true
            setVisibilities([...visibilities])
            setMonochrome(true)
        }
    }

    return <>
        <div className={'mineral-bar'}>
            { MINERALS.map((mineral, i) => (
                <button
                    onClick={getMineralSetter(i)}
                    data-active={visibilities[i]}
                    key={i}
                >
                    {mineral}
                </button>
            )) }
            <button
                className={'blend-menu-toggle'}
                data-active={menuOpen}
                onClick={() => setMenuOpen(!menuOpen)}
            >
                <MdColorLens />
            </button>
        </div>
        <div className={'blend-menu-wrap'}>
            { menuOpen && <BlendMenu
                minerals={MINERALS}
                palettes={COLOR_PRESETS}
                magnitudes={magnitudes}
                setMagnitudes={setMagnitudes}
                visibilities={visibilities}
                setVisibilities={setVisibilities}
                palette={palette}
                setPalette={setPalette}
                blendMode={blendMode}
                setBlendMode={setBlendMode}
                saturation={saturation}
                setSaturation={setSaturation}
                threshold={threshold}
                setThreshold={setThreshold}
                monochrome={monochrome}
                setMonochrome={setMonochrome}
            /> }
        </div>
    </>
}

export default MineralControls

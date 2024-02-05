import { useState, useEffect, ReactElement } from 'react'
import { MdColorLens } from 'react-icons/md'
import { useBlendState } from '../components/blend-context'
import { GenericPalette } from '../lib/palettes'
import BlendMenu from '../components/blend-menu'
import FullCoreRenderer from '../vis/full-core'
import '../styles/mineral-controls.css'

type MineralControlsProps = {
    vis: FullCoreRenderer | null,
    minerals: Array<string>,
    palettes: Array<GenericPalette>
}

function MineralControls (
    { vis, minerals, palettes }: MineralControlsProps
): ReactElement {
    const {
        palette, magnitudes, saturation, threshold, mode,
        visibilities, setVisibilities, monochrome, setMonochrome
    } = useBlendState()
    const [menuOpen, setMenuOpen] = useState<boolean>(false)

    useEffect(() => {
        vis?.setBlending({
            palette,
            magnitudes,
            visibilities,
            saturation,
            threshold,
            mode,
            monochrome
        })
    }, [vis, magnitudes, visibilities, palette, saturation, threshold, mode, monochrome])

    // setup keyboard shortcuts
    useEffect(() => {
        const keydown = (e: KeyboardEvent): void => {
            if (e.key === 'b') {
                setMonochrome(!monochrome)
                return
            }
            const numKey = parseInt(e.key)
            if (numKey > 0 && numKey <= minerals.length) {
                visibilities[numKey - 1] = !visibilities[numKey - 1]
                setVisibilities([...visibilities])
            }
        }
        window.addEventListener('keydown', keydown)
        return () => {
            window.removeEventListener('keydown', keydown)
        }
    }, [monochrome, visibilities, minerals, setMonochrome, setVisibilities])

    // update visibilities to match newly selected palette on change
    useEffect(() => {
        if (palette.type === 'labelled') {
            const visibleMinerals = Object.keys(palette.colors)
            setVisibilities(minerals.map(mineral => visibleMinerals.includes(mineral)))
        } else {
            const numVisible = palette.colors.length
            setVisibilities(minerals.map((_, i) => i < numVisible))
        }
    }, [palette, minerals, setVisibilities])

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
            <div className={'minerals'}>
                { minerals.map((mineral, i) => (
                    <button
                        onClick={getMineralSetter(i)}
                        data-active={visibilities[i]}
                        key={i}
                    >
                        {mineral}
                    </button>
                )) }
            </div>
            <button
                className={'blend-menu-toggle'}
                data-active={menuOpen}
                onClick={() => setMenuOpen(!menuOpen)}
            >
                <MdColorLens />
            </button>
        </div>
        { menuOpen &&
            <BlendMenu
                minerals={minerals}
                palettes={palettes}
            /> }
    </>
}

export default MineralControls

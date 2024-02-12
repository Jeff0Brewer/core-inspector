import { useState, useEffect, ReactElement } from 'react'
import { MdColorLens } from 'react-icons/md'
import { useBlendState, useBlending } from '../../hooks/blend-context'
import { GenericPalette } from '../../lib/palettes'
import BlendMenu from '../../components/blend-menu'
import CoreRenderer from '../../vis/core'
import '../../styles/core-mineral-controls.css'

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
        monochrome,
        setMonochrome
    } = useBlendState()

    useBlending(vis)

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

    return (
        <div className={'core-mineral-controls'}>
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
        </div>
    )
}

export default CoreMineralControls

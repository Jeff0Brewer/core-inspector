import { useState, useEffect, ReactElement } from 'react'
import { MdColorLens } from 'react-icons/md'
import BlendMenu from '../components/blend-menu'
import { BlendParams, MINERALS, COLOR_PRESETS } from '../vis/mineral-blend'
import VisRenderer from '../vis/vis'
import '../styles/mineral-controls.css'

type MineralControlsProps = {
    vis: VisRenderer | null
}

function MineralControls (
    { vis }: MineralControlsProps
): ReactElement {
    const [blendParams, setBlendParams] = useState<BlendParams>({
        magnitudes: new Array(MINERALS.length).fill(1),
        visibilities: new Array(MINERALS.length).fill(true),
        palette: COLOR_PRESETS[0],
        saturation: 1,
        threshold: 0,
        mode: 'additive',
        monochrome: false
    })
    const [menuOpen, setMenuOpen] = useState<boolean>(false)

    useEffect(() => {
        if (!vis) { return }

        vis.uiState.setBlending = setBlendParams
        vis?.setBlending(blendParams)

        // only want to update blending / set ui state when vis changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [vis])

    // setup keyboard shortcuts
    useEffect(() => {
        const keydown = (e: KeyboardEvent): void => {
            if (e.key === 'b') {
                blendParams.monochrome = !blendParams.monochrome
                vis?.setBlending({ ...blendParams })
            } else {
                const numKey = parseInt(e.key)
                if (numKey > 0 && numKey <= MINERALS.length) {
                    blendParams.visibilities[numKey - 1] = !blendParams.visibilities[numKey - 1]
                    vis?.setBlending({ ...blendParams })
                }
            }
        }
        window.addEventListener('keydown', keydown)
        return () => {
            window.removeEventListener('keydown', keydown)
        }
    }, [blendParams, vis])

    // update visibilities to match newly selected palette on change
    useEffect(() => {
        if (blendParams.palette.type === 'labelled') {
            const visibleMinerals = Object.keys(blendParams.palette.colors)
            blendParams.visibilities = MINERALS.map(mineral => visibleMinerals.includes(mineral))
        } else {
            const numVisible = blendParams.palette.colors.length
            blendParams.visibilities.fill(true)
            blendParams.visibilities.fill(false, numVisible)
        }
        vis?.setBlending({ ...blendParams })

        // only want to align visibilities with palette on palette / vis change
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [blendParams.palette, vis])

    // sets parameters to show one channel in monochrome
    const getMineralSetter = (i: number): (() => void) => {
        return () => {
            blendParams.visibilities.fill(false)
            blendParams.visibilities[i] = true
            blendParams.monochrome = true
            vis?.setBlending({ ...blendParams })
        }
    }

    return <>
        <div className={'mineral-bar'}>
            { MINERALS.map((mineral, i) => (
                <button
                    onClick={getMineralSetter(i)}
                    data-active={blendParams.visibilities[i]}
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
                blendParams={blendParams}
                setBlendParams={b => vis?.setBlending(b)}
            /> }
        </div>
    </>
}

export default MineralControls

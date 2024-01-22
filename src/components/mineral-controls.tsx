import { useState, useEffect, ReactElement } from 'react'
import { MdColorLens } from 'react-icons/md'
import MineralBlend from '../components/mineral-blend'
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
    }, [vis])

    useEffect(() => {
        vis?.setBlending(blendParams)
    }, [vis, blendParams])

    useEffect(() => {
        if (blendParams.palette.type === 'labelled') {
            const visibleMinerals = Object.keys(blendParams.palette.colors)
            blendParams.visibilities = MINERALS.map(mineral => visibleMinerals.includes(mineral))
        } else {
            const numVisible = blendParams.palette.colors.length
            blendParams.visibilities.fill(true)
            blendParams.visibilities.fill(false, numVisible)
        }
        setBlendParams({ ...blendParams })

        // only want to update visiblities on palette change
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [blendParams.palette])

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
                onClick={() => setMenuOpen(!menuOpen)}
            >
                <MdColorLens />
            </button>
        </div>
        <div className={'blend-menu-wrap'}>
            { menuOpen && <MineralBlend
                minerals={MINERALS}
                palettes={COLOR_PRESETS}
                blendParams={blendParams}
                setBlendParams={b => vis?.setBlending(b)}
            /> }
        </div>
    </>
}

export default MineralControls

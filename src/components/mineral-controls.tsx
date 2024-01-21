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
        palette: COLOR_PRESETS[0],
        saturation: 1,
        threshold: 0,
        mode: 'additive'
    })
    const [menuOpen, setMenuOpen] = useState<boolean>(false)

    useEffect(() => {
        if (!vis) { return }
        vis.uiState.setBlending = setBlendParams
    }, [vis])

    useEffect(() => {
        vis?.setBlending(blendParams)
    }, [vis, blendParams])

    const getMineralSetter = (i: number): (() => void) => {
        return () => {
            blendParams.magnitudes.fill(0)
            blendParams.magnitudes[i] = 1
            vis?.setBlending({ ...blendParams })
        }
    }

    return <>
        <div className={'mineral-bar'}>
            { MINERALS.map((mineral, i) => (
                <button
                    onClick={getMineralSetter(i)}
                    data-active={blendParams.magnitudes[i] > 0}
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

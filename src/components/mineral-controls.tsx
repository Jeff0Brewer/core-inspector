import { useState, useEffect, ReactElement } from 'react'
import { MdColorLens } from 'react-icons/md'
import MineralBlend from '../components/mineral-blend'
import { BlendParams, MINERALS, COLOR_PRESETS } from '../vis/mineral-blend'
import VisRenderer from '../vis/vis'

type MineralControlsProps = {
    vis: VisRenderer | null
}

function MineralControls (
    { vis }: MineralControlsProps
): ReactElement {
    const [blendParams, setBlendParams] = useState<BlendParams>({
        magnitudes: new Array(MINERALS.length).fill(1),
        palette: COLOR_PRESETS[2],
        saturation: 1,
        threshold: 0,
        mode: 'additive'
    })
    const [menuOpen, setMenuOpen] = useState<boolean>(false)

    useEffect(() => {
        if (!vis) { return }

        vis.uiState.setBlending = setBlendParams

        vis.setBlending(blendParams)

        // don't include state vars in dependency array
        // since only want to reset state when vis re-initialized
        //
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [vis])

    const getMineralSetter = (i: number): (() => void) => {
        return () => {
            blendParams.magnitudes.fill(0)
            blendParams.magnitudes[i] = 1
            console.log(blendParams)
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
        { menuOpen && <MineralBlend
            minerals={MINERALS}
            palettes={COLOR_PRESETS}
            blendParams={blendParams}
            setBlendParams={b => vis?.setBlending(b)}
        /> }
    </>
}

export default MineralControls

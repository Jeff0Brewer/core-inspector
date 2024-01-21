import { useState, useEffect, ReactElement } from 'react'
import { MdColorLens } from 'react-icons/md'
import MineralBlend from '../components/mineral-blend'
import { BlendParams } from '../vis/mineral-blend'
import VisRenderer from '../vis/vis'

type MineralControlsProps = {
    vis: VisRenderer | null
}

function MineralControls (
    { vis }: MineralControlsProps
): ReactElement {
    const [blendParams, setBlendParams] = useState<BlendParams>({
        magnitudes: new Array(MINERALS.length).fill(1),
        colors: COLOR_PRESETS[2],
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
            setBlendParams({ ...blendParams })
        }
    }

    return <>
        <div className={'mineral-bar'}>
            { MINERALS.map((mineral, i) => (
                <button
                    onClick={() => getMineralSetter(i)}
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
            setBlending={b => vis?.setBlending(b)}
        /> }
    </>
}

const MINERALS = [
    'chlorite',
    'epidote',
    'prehnite',
    'zeolite',
    'amphibole',
    'pyroxene',
    'gypsum',
    'carbonate',
    'kaolinite-montmorillinite'
]

const COLOR_MINERAL_PRESETS: Array<LabelledPalette> = [
    {
        chlorite: [0.6039, 0.6588, 0.5647],
        epidote: [0.6705, 0.7411, 0.6823],
        prehnite: [0.4156, 0.4745, 0.5764],
        zeolite: [1, 1, 1],
        amphibole: [0.8, 0.7843, 0.6941],
        pyroxene: [0.8039, 0.8509, 0.8666],
        gypsum: [0.4431, 0.5960, 0.3333],
        carbonate: [0.4705, 0.3450, 0.5882]
    }, {
        chlorite: [0.2470, 0.6549, 0.8392],
        prehnite: [0.8039, 0.3490, 0.5647],
        zeolite: [0.9686, 0.6156, 0.5176],
        carbonate: [0.9803, 0.7529, 0.3686],
        'kaolinite-montmorillinite': [0.9333, 0.3882, 0.3215]
    }
]

const COLOR_PRESETS: Array<UnlabelledPalette> = [
    [
        [0.4705, 0.3450, 0.5882],
        [0.6705, 0.7411, 0.6862],
        [0.4156, 0.4745, 0.5764]
    ], [
        [0.3803, 0.2313, 0.3529],
        [0.5372, 0.3764, 0.5568],
        [0.7294, 0.5843, 0.5764],
        [0.9294, 0.9764, 0.6666],
        [0.7843, 0.9803, 0.7411]
    ],
    [
        [0.9647, 0.4274, 0.6078],
        [0.3921, 0.4549, 0.8039],
        [0.3019, 0.7529, 0.7098],
        [0.2039, 0.5647, 0.8627],
        [0.2196, 0.7568, 0.4470],
        [0.5843, 0.3803, 0.8862],
        [0.8901, 0.2039, 0.1843],
        [0.9647, 0.6, 0.2470],
        [1, 0.9294, 0.2901]
    ]
]

export default MineralControls

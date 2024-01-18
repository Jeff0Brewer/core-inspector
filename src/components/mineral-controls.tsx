import { useState, useEffect, ReactElement } from 'react'
import MineralSelect from '../components/mineral-select'
import MineralBlend from '../components/mineral-blend'
import VisRenderer, { VIS_DEFAULTS } from '../vis/vis'
import '../styles/app.css'

type MineralControlsProps = {
    vis: VisRenderer | null
}

function MineralControls (
    { vis }: MineralControlsProps
): ReactElement {
    const [mineral, setMineral] = useState<number>(VIS_DEFAULTS.mineral.index)

    useEffect(() => {
        if (!vis) { return }
        vis.uiState.setMineral = setMineral

        vis.setMineral(mineral)

        // don't include state vars in dependency array
        // since only want to reset state when vis re-initialized
        //
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [vis])

    return <>
        <MineralSelect
            minerals={MINERALS}
            currMineral={mineral}
            setMineral={m => vis?.setMineral(m)}
        />
        <MineralBlend
            minerals={MINERALS}
            currMineral={mineral}
            setMineral={m => vis?.setMineral(m)}
            setBlending={b => vis?.setBlending(b)}
        />
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

export default MineralControls

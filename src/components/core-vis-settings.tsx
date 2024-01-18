import { useState, useEffect, ReactElement } from 'react'
import { PiSpiralLight } from 'react-icons/pi'
import { RxDragHandleDots1, RxColumns } from 'react-icons/rx'
import { CoreViewMode, CoreShape } from '../vis/core'
import ToggleSelect from '../components/toggle-select'
import CoreSelect from '../components/core-select'
import VisRenderer, { VIS_DEFAULTS } from '../vis/vis'
import '../styles/core-vis-settings.css'

type CoreVisSettingsProps = {
    vis: VisRenderer | null,
    cores: Array<string>,
    currentCore: string,
    setCurrentCore: (c: string) => void,
}

function CoreVisSettings (
    { vis, cores, currentCore, setCurrentCore }: CoreVisSettingsProps
): ReactElement {
    const [shape, setShape] = useState<CoreShape>(VIS_DEFAULTS.core.shape)
    const [viewMode, setViewMode] = useState<CoreViewMode>(VIS_DEFAULTS.core.viewMode)

    useEffect(() => {
        if (!vis) { return }
        vis.uiState.setShape = setShape
        vis.uiState.setViewMode = setViewMode

        vis.setShape(shape)
        vis.setViewMode(viewMode)

        // don't include state vars in dependency array
        // since only want to reset state when vis re-initialized
        //
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [vis])

    return <>
        <ToggleSelect<CoreShape>
            currValue={shape}
            setValue={ s => vis?.setShape(s) }
            item0={{ value: 'column', icon: ICONS.column }}
            item1={{ value: 'spiral', icon: ICONS.spiral }}
        />
        <ToggleSelect<CoreViewMode>
            currValue={viewMode}
            setValue={v => vis?.setViewMode(v)}
            item0={{ value: 'downscaled', icon: ICONS.downscaled }}
            item1={{ value: 'punchcard', icon: ICONS.punchcard }}
        />
        <CoreSelect
            cores={cores}
            selected={currentCore}
            setSelected={setCurrentCore}
        />
    </>
}

const ICONS = {
    column: <RxColumns style={{ fontSize: '20px' }} />,
    spiral: <PiSpiralLight style={{ fontSize: '25px' }} />,
    downscaled: <div className={'downscaled-icon'}></div>,
    punchcard: <RxDragHandleDots1 style={{ fontSize: '25px' }} />
}

export default CoreVisSettings

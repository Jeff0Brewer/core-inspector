import { useState, useEffect, ReactElement } from 'react'
import { PiSpiralLight } from 'react-icons/pi'
import { RxDragHandleDots1, RxColumns } from 'react-icons/rx'
import { padZeros } from '../lib/util'
import { CoreViewMode, CoreShape } from '../vis/core'
import { CoreMetadata } from '../lib/metadata'
import VisRenderer, { VIS_DEFAULTS } from '../vis/vis'
import ToggleSelect from '../components/generic/toggle-select'
import Dropdown from '../components/generic/dropdown'
import '../styles/core-vis-settings.css'

type CoreVisSettingsProps = {
    vis: VisRenderer | null,
    cores: Array<string>,
    core: string,
    setCore: (c: string) => void,
}

function CoreVisSettings (
    { vis, cores, core, setCore }: CoreVisSettingsProps
): ReactElement {
    const [shape, setShape] = useState<CoreShape>(VIS_DEFAULTS.core.shape)
    const [viewMode, setViewMode] = useState<CoreViewMode>(VIS_DEFAULTS.core.viewMode)
    const [data, setData] = useState<CoreMetadata | null>(null)

    useEffect(() => {
        const getData = async (): Promise<void> => {
            const basePath = `./data/${core}`
            const res = await fetch(`${basePath}/core-metadata.json`)
            const data = await res.json() as CoreMetadata
            setData(data)
        }
        getData()
    }, [core])

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
        <div className={'core-info'}>
            <p>core</p>
            <Dropdown
                items={cores}
                selected={core}
                setSelected={setCore}
                customClass={'core-dropdown'}
            />
            { data && <>
                <p>
                    sections
                    <span>{padZeros(1)} - {padZeros(data.numSection)}</span>
                </p>
                <p>
                    depth
                    <span>{data.topDepth}m - {data.bottomDepth}m</span>
                </p>
            </>}
        </div>
    </>
}

const ICONS = {
    column: <RxColumns style={{ fontSize: '20px' }} />,
    spiral: <PiSpiralLight style={{ fontSize: '25px' }} />,
    downscaled: <div className={'downscaled-icon'}></div>,
    punchcard: <RxDragHandleDots1 style={{ fontSize: '25px' }} />
}

export default CoreVisSettings

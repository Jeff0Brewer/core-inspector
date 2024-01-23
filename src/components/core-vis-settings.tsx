import { useState, useEffect, ReactElement } from 'react'
import { PiSpiralLight } from 'react-icons/pi'
import { RxDragHandleDots1, RxColumns } from 'react-icons/rx'
import { padZeros } from '../lib/util'
import { CoreViewMode, CoreShape } from '../vis/core'
import { CoreMetadata } from '../lib/metadata'
import VisRenderer from '../vis/vis'
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
    const [shape, setShape] = useState<CoreShape>('column')
    const [viewMode, setViewMode] = useState<CoreViewMode>('downscaled')
    const [metadata, setMetadata] = useState<CoreMetadata | null>(null)

    useEffect(() => {
        const getMetadata = async (): Promise<void> => {
            const basePath = `./data/${core}`
            const res = await fetch(`${basePath}/core-metadata.json`)
            const metadata = await res.json() as CoreMetadata
            setMetadata(metadata)
        }
        getMetadata()
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
            { metadata && <>
                <p>
                    sections
                    <span>{padZeros(1)} - {padZeros(metadata.numSection)}</span>
                </p>
                <p>
                    depth
                    <span>{metadata.topDepth}m - {metadata.bottomDepth}m</span>
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

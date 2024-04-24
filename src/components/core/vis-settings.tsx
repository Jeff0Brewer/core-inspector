import React, { useState, useEffect, ReactElement } from 'react'
import { PiSpiralLight } from 'react-icons/pi'
import { RxDragHandleDots1, RxColumns } from 'react-icons/rx'
import { IoGridSharp } from 'react-icons/io5'
import { padZeros, formatFloat } from '../../lib/util'
import CoreRenderer, { CoreViewMode, CoreShape, CalibrationOption } from '../../vis/core'
import { useCoreMetadata } from '../../hooks/core-metadata-context'
import ToggleSelect from '../../components/generic/toggle-select'
import ToggleButton from '../../components/generic/toggle-button'
import Dropdown from '../../components/generic/dropdown'
import styles from '../../styles/core/vis-settings.module.css'
import coreDropdownStyles from '../../styles/custom/core-dropdown.module.css'

type VisSettingsProps = {
    vis: CoreRenderer | null,
    cores: Array<string>,
    core: string,
    setCore: (c: string) => void,
}

const VisSettings = React.memo((
    { vis, cores, core, setCore }: VisSettingsProps
): ReactElement => {
    const [calibration, setCalibration] = useState<CalibrationOption>('show')
    const [shape, setShape] = useState<CoreShape>('column')
    const [viewMode, setViewMode] = useState<CoreViewMode>('downscaled')
    const { numSection, topDepth, bottomDepth } = useCoreMetadata()

    useEffect(() => {
        if (!vis) { return }
        vis.uiState.setCalibration = setCalibration
        vis.uiState.setShape = setShape
        vis.uiState.setViewMode = setViewMode

        vis.initCalibration(calibration)
        vis.setShape(shape)
        vis.setViewMode(viewMode)

        // don't include state vars in dependency array
        // since only want to reset state when vis re-initialized
        //
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [vis])

    const toggleCalibration = (): void => {
        if (calibration === 'show') {
            vis?.setCalibration('remove')
        } else {
            vis?.setCalibration('show')
        }
    }

    return (
        <div className={styles.settings}>
            <ToggleButton
                active={calibration === 'show'}
                toggleValue={toggleCalibration}
                icon={ICONS.calibration}
            />
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
            <div className={styles.info}>
                <p>core</p>
                <Dropdown
                    items={cores}
                    selected={core}
                    setSelected={setCore}
                    customStyles={coreDropdownStyles}
                />
                { numSection && <p>
                    sections
                    <span>{padZeros(1)} - {padZeros(numSection)}</span>
                </p> }
                { topDepth && bottomDepth && <p>
                    depth
                    <span>
                        {formatFloat(topDepth)}m - {formatFloat(bottomDepth)}m
                    </span>
                </p> }
            </div>
        </div>
    )
})

const ICONS = {
    calibration: <IoGridSharp style={{ fontSize: '16px' }} />,
    column: <RxColumns style={{ fontSize: '20px' }} />,
    spiral: <PiSpiralLight style={{ fontSize: '25px' }} />,
    downscaled: <div className={styles.downscaledIcon}></div>,
    punchcard: <RxDragHandleDots1 style={{ fontSize: '25px' }} />
}

export default VisSettings

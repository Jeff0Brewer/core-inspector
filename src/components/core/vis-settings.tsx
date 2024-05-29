import React, { useEffect, ReactElement } from 'react'
import { PiSpiralLight } from 'react-icons/pi'
import { RxDragHandleDots1, RxColumns } from 'react-icons/rx'
import { padZeros, formatFloat } from '../../lib/util'
import CoreRenderer, { CoreViewMode, CoreShape, CalibrationOption } from '../../vis/core'
import { useCoreParamsContext } from '../../hooks/core-params-context'
import { useIdContext } from '../../hooks/id-context'
import { useCoreMetadata } from '../../hooks/core-metadata-context'
import ToggleSelect from '../../components/generic/toggle-select'
import Dropdown from '../../components/generic/dropdown'
import CalibrationOnIcon from '../../assets/caps-on-icon.svg'
import CalibrationOffIcon from '../../assets/caps-off-icon.svg'
import Logo from '../../components/logo'
import DownloadLink from '../../components/generic/download-link'
import styles from '../../styles/core/vis-settings.module.css'
import coreDropdownStyles from '../../styles/custom/core-dropdown.module.css'

type VisSettingsProps = {
    vis: CoreRenderer | null
}

const VisSettings = React.memo((
    { vis }: VisSettingsProps
): ReactElement => {
    const {
        calibration, setCalibration,
        shape, setShape,
        viewMode, setViewMode
    } = useCoreParamsContext()
    const { core, cores, setCore } = useIdContext()
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

    return (
        <div className={styles.settings}>
            <div className={styles.left}>
                <Logo />
                <div className={styles.controls}>
                    <ToggleSelect<CoreShape>
                        currValue={shape}
                        setValue={s => vis?.setShape(s)}
                        item0={{ value: 'column', icon: ICONS.column }}
                        item1={{ value: 'spiral', icon: ICONS.spiral }}
                        label={'layout'}
                    />
                    <ToggleSelect<CoreViewMode>
                        currValue={viewMode}
                        setValue={v => vis?.setViewMode(v)}
                        item0={{ value: 'downscaled', icon: ICONS.downscaled }}
                        item1={{ value: 'punchcard', icon: ICONS.punchcard }}
                        label={'view'}
                    />
                    <ToggleSelect<CalibrationOption>
                        currValue={calibration}
                        setValue={c => vis?.setCalibration(c)}
                        item0={{ value: 'show', icon: ICONS.calibrationOn }}
                        item1={{ value: 'remove', icon: ICONS.calibrationOff }}
                        label={'caps'}
                    />
                </div>
            </div>
            <div className={styles.info}>
                <DownloadLink />
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
                { (topDepth !== null && bottomDepth !== null) && <p>
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
    calibrationOn: <img src={CalibrationOnIcon} style={{ height: '27px' }} />,
    calibrationOff: <img src={CalibrationOffIcon} style={{ height: '27px' }} />,
    column: <RxColumns style={{ fontSize: '20px' }} />,
    spiral: <PiSpiralLight style={{ fontSize: '25px' }} />,
    downscaled: <div className={styles.downscaledIcon}></div>,
    punchcard: <RxDragHandleDots1 style={{ fontSize: '25px' }} />
}

export default VisSettings

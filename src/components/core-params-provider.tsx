import { useState, ReactElement, ReactNode } from 'react'
import { CoreShape, CoreViewMode, CoreSpiralOrder, CalibrationOption } from '../vis/core'
import CoreParamsContext from '../hooks/core-params-context'

type CoreParamsProviderProps = {
    children: ReactNode
}

function CoreParamsProvider (
    { children }: CoreParamsProviderProps
): ReactElement {
    const [calibration, setCalibration] = useState<CalibrationOption>('show')
    const [shape, setShape] = useState<CoreShape>('column')
    const [viewMode, setViewMode] = useState<CoreViewMode>('downscaled')
    const [spacing, setSpacing] = useState<[number, number]>([0.5, 0.5])
    const [spiralOrder, setSpiralOrder] = useState<CoreSpiralOrder>('out')

    return (
        <CoreParamsContext.Provider value={{
            calibration,
            setCalibration,
            shape,
            setShape,
            viewMode,
            setViewMode,
            spacing,
            setSpacing,
            spiralOrder,
            setSpiralOrder
        }}>
            {children}
        </CoreParamsContext.Provider>
    )
}

export default CoreParamsProvider

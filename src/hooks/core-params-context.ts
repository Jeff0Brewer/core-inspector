import { createContext, useContext } from 'react'
import { CoreShape, CoreViewMode, CalibrationOption } from '../vis/core'

type CoreParamsContextProps = {
    shape: CoreShape,
    setShape: (s: CoreShape) => void,
    viewMode: CoreViewMode,
    setViewMode: (m: CoreViewMode) => void,
    calibration: CalibrationOption,
    setCalibration: (c: CalibrationOption) => void,
    spacing: [number, number],
    setSpacing: (s: [number, number]) => void
}

const CoreParamsContext = createContext<CoreParamsContextProps | null>(null)

const useCoreParamsContext = (): CoreParamsContextProps => {
    const context = useContext(CoreParamsContext)
    if (context === null) {
        throw new Error('useCoreParamsContext must be called from a child of CoreParamsProvider')
    }
    return context
}

export default CoreParamsContext
export { useCoreParamsContext }

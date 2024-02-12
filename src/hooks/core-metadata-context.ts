import { createContext, useContext } from 'react'
import { DepthMetadata, HydrationMetadata } from '../lib/metadata'

type CoreMetadataContextProps = {
    numSection: number,
    topDepth: number,
    bottomDepth: number,
    depths: DepthMetadata,
    hydrations: HydrationMetadata
}

const CoreMetadataContext = createContext<CoreMetadataContextProps | null>(null)

const useCoreMetadata = (): CoreMetadataContextProps => {
    const context = useContext(CoreMetadataContext)
    if (context === null) {
        throw new Error('useCoreMetadata must be called from a child of CoreMetadataProvider')
    }
    return context
}

export default CoreMetadataContext
export { useCoreMetadata }

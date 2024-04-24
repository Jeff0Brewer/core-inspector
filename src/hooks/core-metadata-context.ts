import { createContext, useContext } from 'react'
import { DepthMetadata, HydrationMetadata, TileTextureMetadata } from '../lib/metadata'

type CoreMetadataContextProps = {
    numSection: number | null,
    topDepth: number | null,
    bottomDepth: number | null,
    partIds: Array<string> | null,
    depths: DepthMetadata | null,
    hydrations: HydrationMetadata | null,
    tiles: TileTextureMetadata | null
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

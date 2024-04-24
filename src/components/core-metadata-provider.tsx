import { useState, useEffect, ReactElement, ReactNode } from 'react'
import { DepthMetadata, HydrationMetadata, TileTextureMetadata } from '../lib/metadata'
import { getCorePath } from '../lib/path'
import CoreMetadataContext from '../hooks/core-metadata-context'

type CoreMetadataProviderProps = {
    core: string,
    children: ReactNode
}

function CoreMetadataProvider (
    { core, children }: CoreMetadataProviderProps
): ReactElement {
    const [numSection, setNumSection] = useState<number | null>(null)
    const [topDepth, setTopDepth] = useState<number | null>(null)
    const [bottomDepth, setBottomDepth] = useState<number | null>(null)
    const [partIds, setPartIds] = useState<Array<string> | null>(null)
    const [depths, setDepths] = useState<DepthMetadata | null>(null)
    const [hydrations, setHydrations] = useState<HydrationMetadata | null>(null)
    const [tiles, setTiles] = useState<TileTextureMetadata | null>(null)

    useEffect(() => {
        const getData = async (): Promise<void> => {
            const corePath = getCorePath(core)

            const [
                { numSection, topDepth, bottomDepth, partIds },
                { depth },
                { hydration },
                tiles
            ] = await Promise.all([
                fetch(`${corePath}/core-metadata.json`).then(res => res.json()),
                fetch(`${corePath}/depth-metadata.json`).then(res => res.json()),
                fetch(`${corePath}/hydration-metadata.json`).then(res => res.json()),
                fetch(`${corePath}/tile-metadata.json`).then(res => res.json())
            ])
            setNumSection(numSection)
            setTopDepth(topDepth)
            setBottomDepth(bottomDepth)
            setDepths(depth)
            setHydrations(hydration)
            setPartIds(partIds)
            setTiles(tiles)
        }

        getData()
    }, [core])

    const value = {
        numSection,
        topDepth,
        bottomDepth,
        depths,
        hydrations,
        partIds,
        tiles
    }

    return (
        <CoreMetadataContext.Provider value={value}>
            {children}
        </CoreMetadataContext.Provider>
    )
}

export default CoreMetadataProvider

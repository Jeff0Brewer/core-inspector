import { useState, useEffect, ReactElement, ReactNode } from 'react'
import { CoreMetadata, DepthMetadata, HydrationMetadata, TileTextureMetadata } from '../lib/metadata'
import { useIdContext } from '../hooks/id-context'
import { getCorePath } from '../lib/path'
import { fetchJson } from '../lib/load'
import CoreMetadataContext from '../hooks/core-metadata-context'

type CoreMetadataProviderProps = {
    children: ReactNode
}

function CoreMetadataProvider (
    { children }: CoreMetadataProviderProps
): ReactElement {
    const [numSection, setNumSection] = useState<number | null>(null)
    const [topDepth, setTopDepth] = useState<number | null>(null)
    const [bottomDepth, setBottomDepth] = useState<number | null>(null)
    const [partIds, setPartIds] = useState<Array<string> | null>(null)
    const [depths, setDepths] = useState<DepthMetadata | null>(null)
    const [hydrations, setHydrations] = useState<HydrationMetadata | null>(null)
    const [tiles, setTiles] = useState<TileTextureMetadata | null>(null)
    const [metadataLoaded, setMetadataLoaded] = useState<boolean>(false)
    const { core } = useIdContext()

    useEffect(() => {
        const getData = async (): Promise<void> => {
            const corePath = getCorePath(core)

            const [coreData, depths, hydrations, tiles] = await Promise.all([
                fetchJson<CoreMetadata>(`${corePath}/core-metadata.json`),
                fetchJson<DepthMetadata>(`${corePath}/depth-metadata.json`),
                fetchJson<HydrationMetadata>(`${corePath}/hydration-metadata.json`),
                fetchJson<TileTextureMetadata>(`${corePath}/tile-metadata.json`)
            ])
            if (coreData !== null) {
                const { numSection, topDepth, bottomDepth, partIds } = coreData
                setNumSection(numSection)
                setTopDepth(topDepth)
                setBottomDepth(bottomDepth)
                setPartIds(partIds)
            }
            setDepths(depths)
            setHydrations(hydrations)
            setTiles(tiles)
            setMetadataLoaded(true)
        }

        // clear values from last core
        setMetadataLoaded(false)
        setNumSection(null)
        setTopDepth(null)
        setBottomDepth(null)
        setPartIds(null)
        setDepths(null)
        setHydrations(null)
        setTiles(null)

        getData()
    }, [core])

    const value = {
        numSection,
        topDepth,
        bottomDepth,
        depths,
        hydrations,
        partIds,
        tiles,
        metadataLoaded
    }

    return (
        <CoreMetadataContext.Provider value={value}>
            {children}
        </CoreMetadataContext.Provider>
    )
}

export default CoreMetadataProvider

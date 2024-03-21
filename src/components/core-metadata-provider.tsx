import { useState, useEffect, ReactElement, ReactNode } from 'react'
import { DepthMetadata, HydrationMetadata } from '../lib/metadata'
import CoreMetadataContext from '../hooks/core-metadata-context'

type CoreMetadataProviderProps = {
    core: string,
    children: ReactNode
}

function CoreMetadataProvider (
    { core, children }: CoreMetadataProviderProps
): ReactElement {
    const [numSection, setNumSection] = useState<number>(0)
    const [topDepth, setTopDepth] = useState<number>(0)
    const [bottomDepth, setBottomDepth] = useState<number>(0)
    const [depths, setDepths] = useState<DepthMetadata>({})
    const [hydrations, setHydrations] = useState<HydrationMetadata>({})
    const [ids, setIds] = useState<Array<string>>([])

    useEffect(() => {
        const getData = async (): Promise<void> => {
            const [
                { numSection, topDepth, bottomDepth },
                { depth },
                { hydration },
                { ids }
            ] = await Promise.all([
                fetch(`./data/${core}/core-metadata.json`).then(res => res.json()),
                fetch(`./data/${core}/depth-metadata.json`).then(res => res.json()),
                fetch(`./data/${core}/hydration-metadata.json`).then(res => res.json()),
                fetch(`./data/${core}/id-metadata.json`).then(res => res.json())
            ])
            setNumSection(numSection)
            setTopDepth(topDepth)
            setBottomDepth(bottomDepth)
            setDepths(depth)
            setHydrations(hydration)
            setIds(ids)
        }

        getData()
    }, [core])

    const value = {
        numSection,
        topDepth,
        bottomDepth,
        depths,
        hydrations,
        ids
    }

    return (
        <CoreMetadataContext.Provider value={value}>
            {children}
        </CoreMetadataContext.Provider>
    )
}

export default CoreMetadataProvider

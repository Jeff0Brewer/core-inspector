import { useState, useEffect, useRef, ReactElement } from 'react'
import { usePopupPosition } from '../../hooks/popup-position'
import { padZeros, formatFloat, formatPercent } from '../../lib/util'
import { DepthMetadata, HydrationMetadata } from '../../lib/metadata'
import CoreRenderer from '../../vis/core'
import '../../styles/metadata-hover.css'

type MetadataHoverProps = {
    vis: CoreRenderer | null,
    core: string,
}

function MetadataHover ({ vis, core }: MetadataHoverProps): ReactElement {
    const [hovered, setHovered] = useState<string | null>(null)
    const [depth, setDepth] = useState<DepthMetadata>({})
    const [hydration, setHydration] = useState<HydrationMetadata>({})
    const popupRef = useRef<HTMLDivElement>(null)

    usePopupPosition(popupRef)

    useEffect(() => {
        if (!vis) { return }
        vis.uiState.setHovered = setHovered
        vis.setHovered(null)
    }, [vis])

    // get data for current core
    useEffect(() => {
        const getData = async (): Promise<void> => {
            const basePath = `./data/${core}`
            const [{ depth }, { hydration }] = await Promise.all([
                fetch(`${basePath}/depth-metadata.json`).then(res => res.json()),
                fetch(`${basePath}/hydration-metadata.json`).then(res => res.json())
            ])

            setDepth(depth)
            setHydration(hydration)
        }

        getData()
    }, [core])

    const hasData = hovered && (depth[hovered] || hydration[hovered])

    return (
        <div
            className={'metadata'}
            ref={popupRef}
            data-hovered={!!hovered}
        >
            { hovered && <div className={'id'}>
                {formatId(hovered)}
            </div> }
            { hasData && <div className={'data'}>
                { depth[hovered] && <div>
                    <p>top depth</p>
                    <span>{formatFloat(depth[hovered].topDepth)}m</span>
                </div> }
                { depth[hovered] && <div>
                    <p>length</p>
                    <span>{formatFloat(depth[hovered].length)}m</span>
                </div> }
                { hydration[hovered] && <div>
                    <p>hydration</p>
                    <span>{formatFloat(hydration[hovered] * 100)}%</span>
                </div> }
            </div> }
        </div>
    )
}

function formatId (id: string): string {
    const [section, part] = id.split('_')
    return `${padZeros(section, 4)}Z-${padZeros(part, 2)}`
}

export default MetadataHover

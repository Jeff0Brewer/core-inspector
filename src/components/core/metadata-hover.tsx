import { useState, useEffect, useRef, ReactElement } from 'react'
import { usePopupPosition } from '../../hooks/popup-position'
import { useCoreMetadata } from '../../hooks/core-metadata-context'
import { padZeros, formatFloat } from '../../lib/util'
import CoreRenderer from '../../vis/core'
import styles from '../../styles/core/metadata-hover.module.css'

type MetadataHoverProps = {
    vis: CoreRenderer | null
}

function MetadataHover ({ vis }: MetadataHoverProps): ReactElement {
    const { depths, hydrations } = useCoreMetadata()
    const [hovered, setHovered] = useState<string | null>(null)
    const popupRef = useRef<HTMLDivElement>(null)

    usePopupPosition(popupRef)

    useEffect(() => {
        if (!vis) { return }
        vis.uiState.setHovered = setHovered
        vis.setHovered(null)
    }, [vis])

    const hasData = hovered && (depths[hovered] || hydrations[hovered])

    return (
        <div
            className={styles.metadata}
            ref={popupRef}
            data-hovered={!!hovered}
        >
            { hovered && <div className={styles.id}>
                {formatId(hovered)}
            </div> }
            { hasData && <div className={styles.data}>
                { depths[hovered] && <div>
                    <p>top depth</p>
                    <span>{formatFloat(depths[hovered].topDepth)}m</span>
                </div> }
                { depths[hovered] && <div>
                    <p>length</p>
                    <span>{formatFloat(depths[hovered].length)}m</span>
                </div> }
                { hydrations[hovered] && <div>
                    <p>hydration</p>
                    <span>{formatFloat(hydrations[hovered] * 100)}%</span>
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

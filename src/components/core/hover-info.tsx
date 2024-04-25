import { useState, useEffect, useRef, ReactElement } from 'react'
import { usePopupPosition } from '../../hooks/popup-position'
import { useCoreMetadata } from '../../hooks/core-metadata-context'
import { formatFloat } from '../../lib/util'
import { getPartId } from '../../lib/path'
import CoreRenderer from '../../vis/core'
import styles from '../../styles/core/metadata-hover.module.css'

type HoverInfoProps = {
    vis: CoreRenderer | null
}

function HoverInfo ({ vis }: HoverInfoProps): ReactElement {
    const { depths, hydrations } = useCoreMetadata()
    const [hovered, setHovered] = useState<string | null>(null)
    const popupRef = useRef<HTMLDivElement>(null)

    usePopupPosition(popupRef)

    useEffect(() => {
        if (!vis) { return }
        vis.uiState.setHovered = setHovered
        vis.setHovered(null)
    }, [vis])

    const hasData = hovered && (depths?.[hovered] || hydrations?.[hovered])

    return (
        <div
            ref={popupRef}
            className={`${styles.metadata} ${!!hovered && styles.visible}`}
        >
            { hovered && <div className={styles.id}>
                {getPartId(hovered)}
            </div> }
            { hasData && <div className={styles.data}>
                { depths?.[hovered] && <div>
                    <p>top depth</p>
                    <span>{formatFloat(depths[hovered].topDepth)}m</span>
                </div> }
                { depths?.[hovered] && <div>
                    <p>length</p>
                    <span>{formatFloat(depths[hovered].length)}m</span>
                </div> }
                { hydrations?.[hovered] && <div>
                    <p>hydration</p>
                    <span>{formatFloat(hydrations[hovered] * 100)}%</span>
                </div> }
            </div> }
        </div>
    )
}

export default HoverInfo

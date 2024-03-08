import { useState, useEffect, ReactElement } from 'react'
import { StringMap } from '../../lib/util'
import PartRenderer from '../../vis/part'
import PartMineralChannels from '../../components/part/mineral-channels'
import CorePanel from '../../components/part/core-panel'
import {
    CoreRepresentation,
    CoreLineRepresentation,
    CoreRectRepresentation,
    CorePunchcardRepresentation,
    CoreChannelPunchcardRepresentation
} from '../../components/part/core-representations'
import styles from '../../styles/part/content.module.css'

type PartContentProps = {
    vis: PartRenderer | null,
    part: string,
    setPart: (p: string | null) => void,
    channels: StringMap<HTMLImageElement>,
    visible: StringMap<boolean>
}

const CORE_PANEL_REPRESENTATIONS: Array<CoreRepresentation> = [
    { element: CoreLineRepresentation, fullScale: true },
    { element: CoreRectRepresentation },
    { element: CorePunchcardRepresentation },
    { element: CoreChannelPunchcardRepresentation, largeWidth: true }
]

function PartContent (
    { vis, part, setPart, channels, visible }: PartContentProps
): ReactElement {
    const [scrollDepthTop, setScrollDepthTop] = useState<number>(0)
    const [scrollDepthBottom, setScrollDepthBottom] = useState<number>(0)
    const [parts, setParts] = useState<Array<string>>([])

    useEffect(() => {
        if (!vis) { return }
        setParts(vis.getParts())
    }, [vis])

    return (
        <div className={styles.content}>
            <CorePanel
                vis={vis}
                part={part}
                parts={parts}
                representations={CORE_PANEL_REPRESENTATIONS}
                setPart={setPart}
                finalTopDepth={scrollDepthTop}
                finalBottomDepth={scrollDepthBottom}
            />
            <PartMineralChannels
                vis={vis}
                part={part}
                channels={channels}
                visible={visible}
                setDepthTop={setScrollDepthTop}
                setDepthBottom={setScrollDepthBottom}
            />
        </div>
    )
}

export default PartContent

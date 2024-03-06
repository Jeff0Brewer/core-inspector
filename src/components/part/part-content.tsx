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

type PartContentProps = {
    vis: PartRenderer | null,
    part: string,
    setPart: (p: string | null) => void,
    channels: StringMap<HTMLImageElement>,
    visible: StringMap<boolean>
}

function PartContent (
    { vis, part, setPart, channels, visible }: PartContentProps
): ReactElement {
    const [scrollDepthTop, setScrollDepthTop] = useState<number>(0)
    const [scrollDepthBottom, setScrollDepthBottom] = useState<number>(0)
    const [parts, setParts] = useState<Array<string>>([])
    const [representations] = useState<Array<CoreRepresentation>>([
        { element: CoreLineRepresentation, fullScale: true },
        { element: CoreRectRepresentation },
        { element: CorePunchcardRepresentation },
        { element: CoreChannelPunchcardRepresentation, largeWidth: true }
    ])

    useEffect(() => {
        if (!vis) { return }
        setParts(vis.getParts())
    }, [vis])

    return <>
        <CorePanel
            vis={vis}
            part={part}
            parts={parts}
            representations={representations}
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
    </>
}

export default PartContent

import { useState, useEffect, ReactElement } from 'react'
import CoreRenderer from '../../vis/core'
import HorizontalScrollbar from '../../components/generic/horizontal-scrollbar'

type PanScrollbarProps = {
    vis: CoreRenderer | null
}

function PanScrollbar (
    { vis }: PanScrollbarProps
): ReactElement {
    const [pan, setPan] = useState<number>(0)
    const [panWidth, setPanWidth] = useState<number>(0)
    const [visible, setVisible] = useState<boolean>(false)

    useEffect(() => {
        if (!vis) { return }

        vis.uiState.setPan = setPan
        vis.uiState.setPanWidth = setPanWidth
    }, [vis])

    useEffect(() => {
        setVisible(panWidth > 0 && panWidth < 1)
    }, [panWidth])

    return (
        <HorizontalScrollbar
            visible={visible}
            visibleWidthPercent={panWidth}
            scrollT={pan}
            setScrollT={t => vis?.setPan(t)}
        />
    )
}

export default PanScrollbar

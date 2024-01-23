import { useState, useEffect, ReactElement } from 'react'
import VisRenderer from '../vis/vis'
import '../styles/pan-scrollbar.css'

type PanScrollbarProps = {
    vis: VisRenderer | null
}

function PanScrollbar (
    { vis }: PanScrollbarProps
): ReactElement {
    const [panLeft, setPanLeft] = useState<number | null>(null)
    const [panWidth, setPanWidth] = useState<number | null>(null)

    useEffect(() => {
        if (!vis) { return }

        vis.uiState.setPanLeft = setPanLeft
        vis.uiState.setPanWidth = setPanWidth
    }, [vis])

    return (
        <div className={'scrollbar-wrap'}>
            { panWidth !== null && panLeft !== null && <div
                className={'scrollbar-handle'}
                style={{
                    width: `${panWidth * 100}%`,
                    left: `${panLeft * 100}%`
                }}
            ></div> }
        </div>
    )
}

export default PanScrollbar

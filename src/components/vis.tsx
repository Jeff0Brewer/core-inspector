import { useState, useEffect, useRef, ReactElement } from 'react'
import MetadataHover from '../components/metadata-hover'
import VisRenderer, { VIS_DEFAULTS } from '../vis/vis'
import '../styles/vis.css'

type VisProps = {
    vis: VisRenderer | null,
    core: string
}

function Vis (
    { vis, core }: VisProps
): ReactElement {
    const [hovered, setHovered] = useState<string | undefined>(VIS_DEFAULTS.core.hovered)
    const frameIdRef = useRef<number>(-1)

    useEffect(() => {
        if (!vis) { return }

        vis.uiState.setHovered = setHovered
        vis.setHovered(undefined)

        return vis.setupEventListeners()
    }, [vis])

    useEffect(() => {
        if (!vis) { return }

        let lastT = 0
        const tick = (t: number): void => {
            const elapsed = (t - lastT) * 0.001
            lastT = t

            vis.draw(elapsed)

            frameIdRef.current = window.requestAnimationFrame(tick)
        }

        frameIdRef.current = window.requestAnimationFrame(tick)
        return () => {
            window.cancelAnimationFrame(frameIdRef.current)
        }
    }, [vis])

    return <>
        <MetadataHover core={core} hovered={hovered} />
    </>
}

export default Vis

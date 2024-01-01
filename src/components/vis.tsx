import { useEffect, useRef, ReactElement } from 'react'
import VisRenderer from '../vis/vis'
import '../styles/vis.css'

type VisProps = {
    vis: VisRenderer
}

function Vis ({ vis }: VisProps): ReactElement {
    const frameIdRef = useRef<number>(-1)

    useEffect(() => {
        return vis.setupEventListeners()
    }, [vis])

    useEffect(() => {
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

    return (
        <></>
    )
}

export default Vis

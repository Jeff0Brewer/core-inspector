import { useEffect, useRef, ReactElement } from 'react'
import styles from '../../styles/generic/canvas-renderer.module.css'

type CanvasRendererProps = {
    canvas: HTMLCanvasElement,
    width: string,
    height: string
}

function CanvasRenderer (
    { canvas, width, height }: CanvasRendererProps
): ReactElement {
    const wrapRef = useRef<HTMLDivElement>(null)

    // add HTML canvas element as child of react element via ref,
    // affords accessing canvas reference when not rendered to dom
    useEffect(() => {
        const wrap = wrapRef.current
        if (!wrap) {
            throw new Error('No reference to canvas container')
        }
        wrap.appendChild(canvas)

        // cleanup canvas element when component is unmounted
        return () => {
            if (wrap.contains(canvas)) {
                wrap.removeChild(canvas)
            }
        }
    })

    return (
        <div
            ref={wrapRef}
            className={styles.canvasWrap}
            style={{ width, height }}
        ></div>
    )
}

export default CanvasRenderer

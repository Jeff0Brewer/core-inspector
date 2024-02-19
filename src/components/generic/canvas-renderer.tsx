import { useEffect, useRef, ReactElement } from 'react'
import '../../styles/canvas-renderer.css'

type CanvasRendererProps = {
    canvas: HTMLCanvasElement,
    width: string,
    height: string
}

function CanvasRenderer (
    { canvas, width, height }: CanvasRendererProps
): ReactElement {
    const wrapRef = useRef<HTMLDivElement>(null)

    // Add HTML canvas element to react element via ref,
    // allows access of canvas reference when not rendered to dom
    useEffect(() => {
        const wrap = wrapRef.current
        if (!wrap) {
            throw new Error('No reference to canvas container')
        }
        while (wrap.lastChild) {
            wrap.removeChild(wrap.lastChild)
        }
        wrap.appendChild(canvas)

        // Cleanup when the component is unmounted
        return () => {
            if (wrap.contains(canvas)) {
                wrap.removeChild(canvas)
            }
        }
    }, [canvas, width, height])

    return (
        <div
            ref={wrapRef}
            className={'canvas-renderer'}
            style={{ width, height }}
        ></div>
    )
}

export default CanvasRenderer

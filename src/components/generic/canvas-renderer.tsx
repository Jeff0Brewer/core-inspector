import { ReactElement } from 'react'
import '../../styles/canvas-renderer.css'

type CanvasRendererProps = {
    canvas: HTMLCanvasElement,
    width: string,
    height: string
}

function CanvasRenderer (
    { canvas, width, height }: CanvasRendererProps
): ReactElement {
    // add HTML canvas element to react element via ref,
    // allows access of canvas reference when not rendered to dom
    const addCanvasChild = (ref: HTMLDivElement | null): void => {
        if (!ref) { return }
        while (ref.lastChild) {
            ref.removeChild(ref.lastChild)
        }
        ref.appendChild(canvas)
    }

    return (
        <div
            ref={addCanvasChild}
            className={'canvas-renderer'}
            style={{ width, height }}
        ></div>
    )
}

export default CanvasRenderer

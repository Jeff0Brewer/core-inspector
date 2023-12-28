import { useState, useEffect, ReactElement } from 'react'
import '../styles/metadata-hover.css'

type MetadataHoverProps = {
    hovered: string | undefined
}

function MetadataHover ({ hovered }: MetadataHoverProps): ReactElement {
    const [x, setX] = useState<number>(0)
    const [y, setY] = useState<number>(0)

    useEffect(() => {
        const mousemove = (e: MouseEvent): void => {
            setX(e.clientX)
            setY(e.clientY)
        }
        window.addEventListener('mousemove', mousemove)
        return () => {
            window.removeEventListener('mousemove', mousemove)
        }
    }, [])

    return <>
        {hovered !== undefined &&
            <div
                className={'metadata-hover'}
                style={{ left: `${x}px`, top: `${y}px` }}
            >
                SECTION { hovered }
            </div> }
    </>
}

export default MetadataHover

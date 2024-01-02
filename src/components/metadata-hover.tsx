import { useState, useEffect, ReactElement } from 'react'
import '../styles/metadata-hover.css'

type DisplayMetadata = {
    hydration?: {[id: string]: number}
}

type MetadataHoverProps = {
    hovered: string | undefined
}

function MetadataHover ({ hovered }: MetadataHoverProps): ReactElement {
    const [x, setX] = useState<number>(0)
    const [y, setY] = useState<number>(0)
    const [data, setData] = useState<DisplayMetadata>({})

    useEffect(() => {
        const getData = async (): Promise<void> => {
            const data: DisplayMetadata = {}

            const basePath = './data/gt1'
            const hydrationMetadata = await fetch(`${basePath}/hydration-metadata.json`)
                .then(res => res.json())

            data.hydration = hydrationMetadata.hydration
            setData({ ...data })
        }
        getData()
    }, [])

    // track mouse for element positioning
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

    const renderInd = (id: string): ReactElement => {
        const [section, part] = id.split('_')
        return (
            <div className={'id'}>
                <p>section <span>{section}</span></p>
                <p>part <span>{part}</span></p>
            </div>
        )
    }

    return <>
        { hovered !== undefined &&
            <div
                className={'metadata'}
                style={{ left: `${x}px`, top: `${y}px` }}
            >
                { renderInd(hovered) }
                { data.hydration && data.hydration[hovered] && <p>
                    hydration:
                    <span>
                        {formatHydration(data.hydration[hovered])}
                    </span>
                </p> }
            </div> }
    </>
}

function formatHydration (h: number): string {
    return (h * 100).toFixed(3) + '%'
}

export default MetadataHover

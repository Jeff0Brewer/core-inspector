import { useState, useEffect, ReactElement } from 'react'
import { padZeros } from '../lib/util'
import '../styles/metadata-hover.css'

type DisplayMetadata = {
    hydration?: {[id: string]: number}
}

type MetadataHoverProps = {
    core: string,
    hovered: string | undefined
}

function MetadataHover ({ core, hovered }: MetadataHoverProps): ReactElement {
    const [x, setX] = useState<number>(0)
    const [y, setY] = useState<number>(0)
    const [data, setData] = useState<DisplayMetadata>({})

    useEffect(() => {
        const getData = async (): Promise<void> => {
            const data: DisplayMetadata = {}

            const basePath = `./data/${core}`
            const hydrationMetadata = await fetch(`${basePath}/hydration-metadata.json`)
                .then(res => res.json())

            data.hydration = hydrationMetadata.hydration
            setData({ ...data })
        }
        getData()
    }, [core])

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

    const formatId = (id: string): string => {
        const [section, part] = id.split('_')
        return `${padZeros(section, 4)}Z-${padZeros(part, 2)}`
    }

    const checkSide = (): string => {
        return x > window.innerWidth * 0.5
            ? 'right'
            : 'left'
    }

    return <>
        { hovered !== undefined &&
            <div
                className={'metadata'}
                style={{ left: `${x}px`, top: `${y}px` }}
                data-side={checkSide()}
            >
                <div className={'id'}>
                    { formatId(hovered) }
                </div>
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

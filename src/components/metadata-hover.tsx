import { useState, useEffect, ReactElement } from 'react'
import { padZeros, formatFloat } from '../lib/util'
import '../styles/metadata-hover.css'

type DisplayMetadata = {
    hydration?: { [id: string] : number},
    depth?: { [id: string]: { topDepth: number, length: number } }
}

type MetadataHoverProps = {
    core: string,
    hovered: string | undefined
}

function MetadataHover ({ core, hovered }: MetadataHoverProps): ReactElement {
    const [data, setData] = useState<DisplayMetadata>({})
    const [x, setX] = useState<number>(0)
    const [y, setY] = useState<number>(0)
    const [hoveredSide, setHoveredSide] = useState<'right' | 'left'>('left')

    // fetch all metadata fields and update display data
    useEffect(() => {
        const getData = async (): Promise<void> => {
            const data: DisplayMetadata = {}

            const basePath = `./data/${core}`
            const [{ hydration }, { depth }] = await Promise.all([
                fetch(`${basePath}/hydration-metadata.json`).then(res => res.json()),
                fetch(`${basePath}/depth-metadata.json`).then(res => res.json())
            ])

            data.hydration = hydration
            data.depth = depth
            setData({ ...data })
        }
        getData()
    }, [core])

    // track mouse for element positioning
    useEffect(() => {
        const mousemove = (e: MouseEvent): void => {
            setX(e.clientX)
            setY(e.clientY)

            // check which side of window mouse is over
            // to position hover element horizontally
            setHoveredSide(
                e.clientX > window.innerWidth * 0.5 ? 'right' : 'left'
            )
        }
        window.addEventListener('mousemove', mousemove)
        return () => {
            window.removeEventListener('mousemove', mousemove)
        }
    }, [])

    return <>
        { hovered !== undefined &&
            <div
                className={'metadata'}
                style={{ left: `${x}px`, top: `${y}px` }}
                data-side={hoveredSide}
            >
                <div className={'id'}>
                    { formatId(hovered) }
                </div>
                <div className={'data'}>
                    { data.hydration && data.hydration[hovered] && <p>
                    hydration:
                        <span>
                            { formatHydration(data.hydration[hovered]) }
                        </span>
                    </p> }
                    { data.depth && data.depth[hovered] && <p>
                    top depth:
                        <span>
                            { formatFloat(data.depth[hovered].topDepth) }m
                        </span>
                    </p> }
                    { data.depth && data.depth[hovered] && <p>
                    length:
                        <span>
                            { formatFloat(data.depth[hovered].length) }m
                        </span>
                    </p> }
                </div>
            </div> }
    </>
}

function formatId (id: string): string {
    const [section, part] = id.split('_')
    return `${padZeros(section, 4)}Z-${padZeros(part, 2)}`
}

function formatHydration (h: number): string {
    return (h * 100).toFixed(3) + '%'
}

export default MetadataHover

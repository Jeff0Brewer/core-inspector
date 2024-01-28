import { useState, useEffect, useRef, ReactElement } from 'react'
import { padZeros, formatFloat, formatPercent } from '../lib/util'
import '../styles/metadata-hover.css'

// positioning for popup element
const X_OFFSET = 0.2
const LEFT_TRANSFORM = `translate(${formatPercent(X_OFFSET)}, -50%)`
const RIGHT_TRANSFORM = `translate(${formatPercent(-1 - X_OFFSET)}, -50%)`

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
    const popupRef = useRef<HTMLDivElement>(null)

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

    useEffect(() => {
        const popup = popupRef.current
        if (!popup) {
            throw new Error('No reference to popup element')
        }

        popup.style.transform = LEFT_TRANSFORM

        const mousemove = (e: MouseEvent): void => {
            popup.style.left = e.clientX + 'px'
            popup.style.top = e.clientY + 'px'

            const popupX = (1 + X_OFFSET) * popup.getBoundingClientRect().width
            if (e.clientX - popupX < 0) {
                popup.style.transform = LEFT_TRANSFORM
            } else if (e.clientX + popupX > window.innerWidth) {
                popup.style.transform = RIGHT_TRANSFORM
            }
        }

        window.addEventListener('mousemove', mousemove)
        return () => {
            window.removeEventListener('mousemove', mousemove)
        }
    }, [])

    const hasData = hovered && (data.depth?.[hovered] || data.hydration?.[hovered])

    return (
        <div className={'metadata'} ref={popupRef}>
            { hovered && <>
                <div className={'id'}>
                    { formatId(hovered) }
                </div>
                { hasData && <div className={'data'}>
                    { data.depth?.[hovered] && <>
                        <p>
                            top depth <span>
                                {formatFloat(data.depth[hovered].topDepth)}m
                            </span>
                        </p>
                        <p>
                            length <span>
                                {formatFloat(data.depth[hovered].length)}m
                            </span>
                        </p>
                    </> }
                    { data.hydration?.[hovered] && <p>
                        hydration <span>
                            {formatFloat(data.hydration[hovered] * 100)}%
                        </span>
                    </p> }
                </div> }
            </> }
        </div>
    )
}

function formatId (id: string): string {
    const [section, part] = id.split('_')
    return `${padZeros(section, 4)}Z-${padZeros(part, 2)}`
}

export default MetadataHover

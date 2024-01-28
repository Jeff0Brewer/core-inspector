import { useState, useEffect, useRef, ReactElement } from 'react'
import { padZeros, formatFloat, formatPercent } from '../lib/util'
import '../styles/metadata-hover.css'

type HydrationMetadata = {
    [id: string]: number
}

type DepthMetadata = {
    [id: string]: {
        topDepth: number,
        length: number
    }
}

type MetadataHoverProps = {
    core: string,
    id: string | undefined
}

function MetadataHover ({ core, id }: MetadataHoverProps): ReactElement {
    const [depth, setDepth] = useState<DepthMetadata>({})
    const [hydration, setHydration] = useState<HydrationMetadata>({})
    const popupRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const getData = async (): Promise<void> => {
            const basePath = `./data/${core}`
            const [{ depth }, { hydration }] = await Promise.all([
                fetch(`${basePath}/depth-metadata.json`).then(res => res.json()),
                fetch(`${basePath}/hydration-metadata.json`).then(res => res.json())
            ])

            setDepth(depth)
            setHydration(hydration)
        }

        getData()
    }, [core])

    useEffect(() => {
        const popup = popupRef.current
        if (!popup) {
            throw new Error('No reference to popup element')
        }

        const xOffset = 0.2
        const rightTransform = `translate(${formatPercent(xOffset)}, -50%)`
        const leftTranform = `translate(${formatPercent(-1 - xOffset)}, -50%)`

        popup.style.transform = rightTransform

        const mousemove = (e: MouseEvent): void => {
            popup.style.left = e.clientX + 'px'
            popup.style.top = e.clientY + 'px'

            const popupWidth = (1 + xOffset) * popup.getBoundingClientRect().width
            if (e.clientX - popupWidth < 0) {
                popup.style.transform = rightTransform
            } else if (e.clientX + popupWidth > window.innerWidth) {
                popup.style.transform = leftTranform
            }
        }

        window.addEventListener('mousemove', mousemove)
        return () => {
            window.removeEventListener('mousemove', mousemove)
        }
    }, [])

    const hasData = id && (depth[id] || hydration[id])

    return (
        <div className={'metadata'} ref={popupRef}>
            { id && <div className={'id'}>
                {formatId(id)}
            </div> }
            { hasData && <div className={'data'}>
                { depth[id] && <>
                    <p>
                        top depth
                        <span>{ formatFloat(depth[id].topDepth) }m</span>
                    </p>
                    <p>
                        length
                        <span>{ formatFloat(depth[id].length) }m</span>
                    </p>
                </> }
                { hydration[id] && <p>
                    hydration
                    <span>{ formatFloat(hydration[id] * 100) }%</span>
                </p> }
            </div> }
        </div>
    )
}

function formatId (id: string): string {
    const [section, part] = id.split('_')
    return `${padZeros(section, 4)}Z-${padZeros(part, 2)}`
}

export default MetadataHover

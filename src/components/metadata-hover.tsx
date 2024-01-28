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

    // get data for current core
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

    // setup popup window positioning
    useEffect(() => {
        const popup = popupRef.current
        if (!popup) {
            throw new Error('No reference to popup element')
        }

        const xTranslate = 0.2
        const rightTransform = `translate(${formatPercent(xTranslate)}, -50%)`
        const leftTransform = `translate(${formatPercent(-1 - xTranslate)}, -50%)`

        popup.style.transform = rightTransform

        const mousemove = (e: MouseEvent): void => {
            popup.style.left = e.clientX + 'px'
            popup.style.top = e.clientY + 'px'

            // shift popup left / right to ensure it stays in window bounds
            const popupWidth = (1 + xTranslate) * popup.getBoundingClientRect().width
            if (e.clientX - popupWidth < 0) {
                popup.style.transform = rightTransform
            } else if (e.clientX + popupWidth > window.innerWidth) {
                popup.style.transform = leftTransform
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
                { depth[id] && <div>
                    <p>top depth</p>
                    <span>{formatFloat(depth[id].topDepth)}m</span>
                </div> }
                { depth[id] && <div>
                    <p>length</p>
                    <span>{formatFloat(depth[id].length)}m</span>
                </div> }
                { hydration[id] && <div>
                    <p>hydration</p>
                    <span>{formatFloat(hydration[id] * 100)}%</span>
                </div> }
            </div> }
        </div>
    )
}

function formatId (id: string): string {
    const [section, part] = id.split('_')
    return `${padZeros(section, 4)}Z-${padZeros(part, 2)}`
}

export default MetadataHover

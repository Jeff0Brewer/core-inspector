import { useState, useEffect, useRef, ReactElement } from 'react'
import { padZeros, formatFloat, formatPercent } from '../lib/util'
import FullCoreRenderer from '../vis/full-core'
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
    vis: FullCoreRenderer | null,
    core: string,
}

function MetadataHover ({ vis, core }: MetadataHoverProps): ReactElement {
    const [hovered, setHovered] = useState<string | null>(null)
    const [depth, setDepth] = useState<DepthMetadata>({})
    const [hydration, setHydration] = useState<HydrationMetadata>({})
    const popupRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!vis) { return }
        vis.uiState.setHovered = setHovered
        vis.setHovered(null)
    }, [vis])

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

    const hasData = hovered && (depth[hovered] || hydration[hovered])

    return (
        <div
            className={'metadata'}
            ref={popupRef}
            data-hovered={!!hovered}
        >
            { hovered && <div className={'id'}>
                {formatId(hovered)}
            </div> }
            { hasData && <div className={'data'}>
                { depth[hovered] && <div>
                    <p>top depth</p>
                    <span>{formatFloat(depth[hovered].topDepth)}m</span>
                </div> }
                { depth[hovered] && <div>
                    <p>length</p>
                    <span>{formatFloat(depth[hovered].length)}m</span>
                </div> }
                { hydration[hovered] && <div>
                    <p>hydration</p>
                    <span>{formatFloat(hydration[hovered] * 100)}%</span>
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

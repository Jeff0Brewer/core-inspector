import { useState, useEffect, useRef, ReactElement } from 'react'
import { clamp } from '../../lib/util'
import FullCoreRenderer from '../../vis/full-core'
import '../../styles/pan-scrollbar.css'

type PanScrollbarProps = {
    vis: FullCoreRenderer | null
}

function PanScrollbar (
    { vis }: PanScrollbarProps
): ReactElement {
    const [pan, setPan] = useState<number>(0)
    const [panWidth, setPanWidth] = useState<number>(0)
    const [dragging, setDragging] = useState<boolean>(false)
    const [handleClickOffset, setHandleClickOffset] = useState<number>(0)

    const scrollbarWrapRef = useRef<HTMLDivElement>(null)
    const scrollbarHandleRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!vis) { return }

        vis.uiState.setPan = setPan
        vis.uiState.setPanWidth = setPanWidth
    }, [vis])

    useEffect(() => {
        if (!vis) { return }

        const scrollbarWrap = scrollbarWrapRef.current
        const scrollbarHandle = scrollbarHandleRef.current
        if (!scrollbarWrap || !scrollbarHandle) {
            throw new Error('No reference to scrollbar elements')
        }

        if (!dragging) {
            const mousedown = (e: MouseEvent): void => {
                setDragging(true)
                const { left, right } = scrollbarHandle.getBoundingClientRect()
                const handleClickPercentage = clamp((e.clientX - left) / (right - left), 0, 1)
                setHandleClickOffset(handleClickPercentage * panWidth)
            }
            scrollbarHandle.addEventListener('mousedown', mousedown)
            return () => {
                scrollbarHandle.removeEventListener('mousedown', mousedown)
            }
        } else {
            const mouseup = (): void => { setDragging(false) }
            const mouseleave = (): void => { setDragging(false) }
            const mousemove = (e: MouseEvent): void => {
                if (dragging) {
                    const { left, right } = scrollbarWrap.getBoundingClientRect()
                    const clickPercent = clamp((e.clientX - left) / (right - left), 0, 1)
                    vis.setPan(clickPercent - handleClickOffset)
                }
            }

            window.addEventListener('mouseleave', mouseleave)
            window.addEventListener('mouseup', mouseup)
            window.addEventListener('mousemove', mousemove)
            return () => {
                window.removeEventListener('mouseleave', mouseleave)
                window.removeEventListener('mouseup', mouseup)
                window.removeEventListener('mousemove', mousemove)
            }
        }
    }, [vis, dragging, handleClickOffset, panWidth])

    return (
        <div
            className={'scrollbar-wrap'}
            data-visible={panWidth > 0 && panWidth < 1}
            data-dragging={dragging}
            ref={scrollbarWrapRef}
        >
            <div
                className={'scrollbar-handle'}
                style={{
                    width: `${(panWidth || 0) * 100}%`,
                    left: `${pan * 100}%`
                }}
                ref={scrollbarHandleRef}
            ></div>
        </div>
    )
}

export default PanScrollbar

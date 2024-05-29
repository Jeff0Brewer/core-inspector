import { useState, useEffect, useRef, ReactElement } from 'react'
import { clamp } from '../../lib/util'
import styles from '../../styles/generic/horizontal-scrollbar.module.css'

type HorizontalScrollbarProps = {
    visibleWidthPercent: number,
    scrollT: number,
    setScrollT: (t: number) => void,
    visible: boolean
}

function HorizontalScrollbar (
    { visibleWidthPercent, visible, scrollT, setScrollT }: HorizontalScrollbarProps
): ReactElement {
    const [dragging, setDragging] = useState<boolean>(false)
    const [handleClickOffset, setHandleClickOffset] = useState<number>(0)
    const scrollbarWrapRef = useRef<HTMLDivElement>(null)
    const scrollbarHandleRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const scrollbarWrap = scrollbarWrapRef.current
        const scrollbarHandle = scrollbarHandleRef.current
        if (!scrollbarWrap || !scrollbarHandle) {
            throw new Error('No reference to scrollbar elements')
        }

        const getHandleOffset = (mouseX: number): number => {
            const { left, right } = scrollbarHandle.getBoundingClientRect()
            const handleClickPercentage = clamp((mouseX - left) / (right - left), 0, 1)
            return handleClickPercentage * visibleWidthPercent
        }

        const getPan = (mouseX: number, handleOffset: number): number => {
            const { left, right } = scrollbarWrap.getBoundingClientRect()
            const clickPercent = clamp((mouseX - left) / (right - left), 0, 1)
            return clickPercent - handleOffset
        }

        if (!dragging) {
            const mousedown = (e: MouseEvent): void => {
                const handleOffset = getHandleOffset(e.clientX)
                const pan = getPan(e.clientX, handleOffset)
                setScrollT(pan)
                setHandleClickOffset(handleOffset)
                setDragging(true)
            }
            scrollbarWrap.addEventListener('mousedown', mousedown)
            return () => {
                scrollbarWrap.removeEventListener('mousedown', mousedown)
            }
        } else {
            const mouseup = (): void => { setDragging(false) }
            const mouseleave = (): void => { setDragging(false) }
            const mousemove = (e: MouseEvent): void => {
                if (dragging) {
                    const pan = getPan(e.clientX, handleClickOffset)
                    setScrollT(pan)
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
    }, [visibleWidthPercent, setScrollT, handleClickOffset, dragging])

    return (
        <div
            className={`${styles.track} ${!visible && styles.trackHidden}`}
            ref={scrollbarWrapRef}
        >
            <div
                className={`${styles.handle} ${!visible && styles.handleHidden}`}
                style={{
                    width: `${visibleWidthPercent * 100}%`,
                    left: `${scrollT * 100}%`
                }}
                ref={scrollbarHandleRef}
            ></div>
        </div>
    )
}

export default HorizontalScrollbar

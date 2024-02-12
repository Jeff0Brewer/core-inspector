import { useEffect, RefObject } from 'react'
import { formatPercent } from '../lib/util'

function usePopupPosition (popupRef: RefObject<HTMLElement>): void {
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
            popup.style.left = `${e.clientX}px`
            popup.style.top = `${e.clientY}px`

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
    }, [popupRef])
}

export {
    usePopupPosition
}

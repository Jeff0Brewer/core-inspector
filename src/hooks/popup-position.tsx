import { useEffect, RefObject } from 'react'
import { formatPercent } from '../lib/util'

// positions element next to mouse for hover dialogs
function usePopupPosition (popupRef: RefObject<HTMLElement>): void {
    useEffect(() => {
        const popup = popupRef.current
        if (!popup) {
            throw new Error('No reference to popup element')
        }

        // translate element to either side of cursor
        const xOffset = 0.2
        const rightTranslate = `translate(${formatPercent(xOffset)}, -50%)`
        const leftTranslate = `translate(${formatPercent(-1 - xOffset)}, -50%)`

        popup.style.transform = rightTranslate

        const mousemove = (e: MouseEvent): void => {
            popup.style.left = `${e.clientX}px`
            popup.style.top = `${e.clientY}px`

            // ensure element remains on screen
            const popupRect = popup.getBoundingClientRect()
            if (popupRect.left < 0) {
                popup.style.transform = rightTranslate
            }
            if (popupRect.right > window.innerWidth) {
                popup.style.transform = leftTranslate
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

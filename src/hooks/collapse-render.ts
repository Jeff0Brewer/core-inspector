import { useState, useEffect, useRef } from 'react'

function useCollapseRender (visible: boolean, timeout: number = 1000): boolean {
    const [render, setRender] = useState<boolean>(visible)
    const timeoutIdRef = useRef<number>(-1)

    // toggle flag to render element, delaying removal from dom
    // to allow animations to finish
    useEffect(() => {
        window.clearTimeout(timeoutIdRef.current)
        if (visible) {
            setRender(true)
        } else {
            timeoutIdRef.current = window.setTimeout(
                () => { setRender(false) },
                timeout
            )
        }
    }, [visible, timeout])

    return render
}

export { useCollapseRender }

import { useState, useEffect, useRef, ReactElement } from 'react'
import '../styles/load-icon.css'

type LoadIconProps = {
    loading: boolean,
    showDelayMs?: number
}

function LoadIcon (
    { loading, showDelayMs = 150 }: LoadIconProps
): ReactElement {
    const [visible, setVisible] = useState<boolean>(false)
    const [render, setRender] = useState<boolean>(false)
    const timeoutIdRef = useRef<number>(-1)

    useEffect(() => {
        // cancel timeouts if loading state changes quickly
        window.clearTimeout(timeoutIdRef.current)

        if (loading) {
            timeoutIdRef.current = window.setTimeout(
                () => setVisible(true),
                showDelayMs
            )
            setRender(true)
        } else {
            timeoutIdRef.current = window.setTimeout(
                () => setRender(false),
                500
            )
            setVisible(false)
        }
    }, [loading, showDelayMs])

    // remove from dom when not needed
    if (!render) {
        return <></>
    }

    return (
        <div
            data-visible={visible}
            className={'load-icon'}
        ></div>
    )
}

export default LoadIcon

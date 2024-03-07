import { useState, useEffect, useRef, ReactElement } from 'react'
import styles from '../../styles/load-icon.module.css'

type LoadIconProps = {
    loading: boolean,
    showDelayMs?: number,
    removeDelayMs?: number
}

function LoadIcon (
    { loading, showDelayMs = 150, removeDelayMs = 500 }: LoadIconProps
): ReactElement {
    const [visible, setVisible] = useState<boolean>(false)
    const [render, setRender] = useState<boolean>(false)
    const timeoutIdRef = useRef<number>(-1)

    useEffect(() => {
        // cancel timeouts if loading state changes quickly
        window.clearTimeout(timeoutIdRef.current)

        if (loading) {
            // render icon to dom immediately on load start
            setRender(true)

            // delay initial visibility setting
            // to prevent icon appearing for short load times
            timeoutIdRef.current = window.setTimeout(
                () => setVisible(true),
                showDelayMs
            )
        } else {
            // hide icon immediately on load finish
            setVisible(false)

            // delay dom removal to allow css transition to
            // complete before stopping render
            timeoutIdRef.current = window.setTimeout(
                () => setRender(false),
                removeDelayMs
            )
        }
    }, [loading, showDelayMs, removeDelayMs])

    // remove from dom when not needed
    if (!render) {
        return <></>
    }

    return (
        <div className={`${styles.icon} ${visible && styles.visible}`}></div>
    )
}

export default LoadIcon

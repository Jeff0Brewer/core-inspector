import { useState, useEffect, ReactElement } from 'react'
import '../styles/load-icon.css'

type LoadIconProps = {
    loading: boolean
}

function LoadIcon (
    { loading }: LoadIconProps
): ReactElement {
    const [visible, setVisible] = useState<boolean>(false)

    useEffect(() => {
        if (loading) {
            setVisible(true)
        } else {
            window.setTimeout(() => setVisible(false), 500)
        }
    }, [loading])

    return <>
        { visible &&
            <div
                className={'load-icon'}
                data-loading={loading}
            ></div> }
    </>
}

export default LoadIcon

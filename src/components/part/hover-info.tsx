import { useRef, ReactElement } from 'react'
import { usePopupPosition } from '../../hooks/popup-position'
import { StringMap } from '../../lib/util'
import styles from '../../styles/part/hover-info.module.css'

type PartHoverInfoProps = {
    abundances: StringMap<number>,
    visible: boolean
}

function PartHoverInfo (
    { abundances, visible }: PartHoverInfoProps
): ReactElement {
    const popupRef = useRef<HTMLDivElement>(null)
    usePopupPosition(popupRef)

    return (
        <div
            className={styles.hoverInfo}
            ref={popupRef}
            data-visible={visible}
        >
            {Object.entries(abundances).map(([mineral, abundance], i) =>
                <div className={styles.abundanceBar} key={i}>
                    <div
                        className={styles.abundance}
                        style={{ height: `${(abundance / 255) * 80}%` }}
                    ></div>
                    <p>{mineral.substring(0, 2)}</p>
                </div>
            )}
        </div>
    )
}

export default PartHoverInfo

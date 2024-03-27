import { useRef, ReactElement } from 'react'
import { usePopupPosition } from '../../hooks/popup-position'
import { StringMap } from '../../lib/util'
import SvgPlot from '../../components/generic/svg-plot'
import styles from '../../styles/part/hover-info.module.css'

type PartHoverInfoProps = {
    abundances: StringMap<number>,
    spectrum: Array<number>,
    visible: boolean
}

function PartHoverInfo (
    { abundances, spectrum, visible }: PartHoverInfoProps
): ReactElement {
    const popupRef = useRef<HTMLDivElement>(null)
    usePopupPosition(popupRef)

    return (
        <div
            ref={popupRef}
            className={`${styles.hoverInfo} ${visible && styles.visible}`}
        >
            <div className={styles.abundances}>
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
            <div className={styles.spectrum}>
                <SvgPlot elements={[{ data: spectrum }]} />
            </div>
        </div>
    )
}

export default PartHoverInfo

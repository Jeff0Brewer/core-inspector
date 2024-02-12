import { useRef, ReactElement } from 'react'
import { usePopupPosition } from '../../hooks/popup-position'
import { StringMap } from '../../lib/util'

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
            className={'hover-info'}
            ref={popupRef}
            data-visible={visible}
        >
            {Object.entries(abundances).map(([mineral, abundance], i) =>
                <div className={'abundance-bar'} key={i}>
                    <div
                        className={'abundance'}
                        style={{ height: `${(abundance / 255) * 100}%` }}
                    ></div>
                    <p>{mineral.substring(0, 2)}</p>
                </div>
            )}
        </div>
    )
}

export default PartHoverInfo

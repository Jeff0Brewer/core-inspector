import { ReactElement, useCallback } from 'react'
import { IoMdClose } from 'react-icons/io'
import { useCoreMetadata } from '../../hooks/core-metadata-context'
import { getCoreId, getPartId } from '../../lib/ids'
import { formatFloat } from '../../lib/util'
import styles from '../../styles/part/info-header.module.css'

type PartInfoHeaderProps = {
    core: string,
    part: string,
    setPart: (p: string | null) => void
}

function PartInfoHeader (
    { core, part, setPart }: PartInfoHeaderProps
): ReactElement {
    const { depths, hydrations } = useCoreMetadata()

    const clearPart = useCallback(() => {
        setPart(null)
    }, [setPart])

    return (
        <div className={styles.wrap}>
            <button className={styles.closeButton} onClick={clearPart}>
                {ICONS.close}
            </button>
            <p>
                core
                <span>
                    {getCoreId(core)}
                </span>
            </p>
            <p>
                section
                <span>
                    {getPartId(part)}
                </span>
            </p>
            { !!depths[part] && <>
                <p>
                    top depth
                    <span className={styles.lowercase}>
                        {formatFloat(depths[part].topDepth)}m
                    </span>
                </p>
                <p>
                    length
                    <span className={styles.lowercase}>
                        {formatFloat(depths[part].length)}m
                    </span>
                </p>
            </> }
            { !!hydrations[part] &&
                <p>
                    hydration
                    <span>
                        {formatFloat(hydrations[part] * 100)}%
                    </span>
                </p> }
        </div>
    )
}

const ICONS = {
    close: <IoMdClose style={{ fontSize: '16px' }} />
}

export default PartInfoHeader

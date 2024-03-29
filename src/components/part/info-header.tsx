import { ReactElement } from 'react'
import { useCoreMetadata } from '../../hooks/core-metadata-context'
import { getCoreId, getPartId } from '../../lib/ids'
import styles from '../../styles/part/info-header.module.css'

type PartInfoHeaderProps = {
    core: string,
    part: string
}

function PartInfoHeader (
    { core, part }: PartInfoHeaderProps
): ReactElement {
    const { depths } = useCoreMetadata()

    return (
        <div className={styles.partInfo}>
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
            { !!depths[part] && <p>
                depth
                <span className={styles.lowercase}>
                    {formatDepthInfo(depths[part].topDepth, depths[part].length)}
                </span>
            </p> }
        </div>
    )
}

function formatDepthInfo (topDepth: number, length: number): string {
    const bottomDepth = topDepth + length
    return `${topDepth.toFixed(2)}m - ${bottomDepth.toFixed(2)}m (${(length * 100).toFixed(0)}cm)`
}

export default PartInfoHeader

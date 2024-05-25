import React, { ReactElement } from 'react'
import { usePartIdContext } from '../../hooks/id-context'
import { useCoreMetadata } from '../../hooks/core-metadata-context'
import { getPartId } from '../../lib/path'
import Logo from '../../components/logo'
import styles from '../../styles/part/info-header.module.css'

const PartInfoHeader = React.memo((): ReactElement => {
    const { core, part } = usePartIdContext()
    const { depths } = useCoreMetadata()

    return (
        <div className={styles.header}>
            <Logo />
            <div className={styles.partInfo}>
                <p>
                    core
                    <span>
                        {core}
                    </span>
                </p>
                <p>
                    section
                    <span>
                        {getPartId(part)}
                    </span>
                </p>
                { depths?.[part] && <p>
                    depth
                    <span className={styles.lowercase}>
                        {formatDepthInfo(depths[part].topDepth, depths[part].length)}
                    </span>
                </p> }
            </div>
        </div>
    )
})

function formatDepthInfo (topDepth: number, length: number): string {
    const bottomDepth = topDepth + length
    return `${topDepth.toFixed(2)}m - ${bottomDepth.toFixed(2)}m (${(length * 100).toFixed(0)}cm)`
}

export default PartInfoHeader

import { ReactElement } from 'react'
import { useCoreMetadata } from '../../hooks/core-metadata-context'
import { getCoreId, getPartId } from '../../lib/ids'
import { formatFloat } from '../../lib/util'

type PartInfoHeaderProps = {
    core: string,
    part: string
}

function PartInfoHeader (
    { core, part }: PartInfoHeaderProps
): ReactElement {
    const { depths, hydrations } = useCoreMetadata()

    return (
        <div className={'section-info'}>
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
                    <span className={'lower'}>
                        {formatFloat(depths[part].topDepth)}m
                    </span>
                </p>
                <p>
                    length
                    <span className={'lower'}>
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

export default PartInfoHeader

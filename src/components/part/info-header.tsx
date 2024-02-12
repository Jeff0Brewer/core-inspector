import { ReactElement } from 'react'
import { getCoreId, getPartId } from '../../lib/ids'

type PartInfoHeaderProps = {
    core: string,
    part: string
}

function PartInfoHeader (
    { core, part }: PartInfoHeaderProps
): ReactElement {
    return (
        <div className={'top'}>
            <div className={'section-info'}>
                <p> core <span>{ getCoreId(core) }</span> </p>
                <p> section <span>{ getPartId(part) }</span> </p>
            </div>
        </div>
    )
}

export default PartInfoHeader

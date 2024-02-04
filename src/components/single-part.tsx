import { useState, useEffect, ReactElement } from 'react'
import { padZeros } from '../lib/util'
import { GenericPalette } from '../lib/palettes'
import '../styles/single-part.css'

type SinglePartProps = {
    part: string | null,
    core: string,
    minerals: Array<string>,
    palettes: Array<GenericPalette>,
    clearPart: () => void
}

function SinglePart (
    { part, core, minerals, palettes, clearPart }: SinglePartProps
): ReactElement {
    const [paths, setPaths] = useState<Array<string>>([])

    useEffect(() => {
        if (!part) { return }

        const [section, piece] = part.split('_').map(str => parseInt(str))
        const paths = getAbundanceFilepaths(core, section, piece, minerals)

        setPaths(paths)
    }, [part, core, minerals])

    if (!part) {
        return <></>
    }
    return <div>
        <button onClick={clearPart}>clear</button>
        <p>core: { core } part: { part }</p>
        { paths && <div className={'mineral-channels'}>
            { paths.map((path, i) =>
                <img src={path} key={i} />
            ) }
        </div> }
    </div>
}

function getAbundanceFilepaths (
    core: string,
    section: number,
    piece: number,
    minerals: Array<string>
): Array<string> {
    const coreId = core.toUpperCase() + 'A'
    const sectionId = padZeros(section, 4) + 'Z'
    const pieceId = padZeros(piece, 3)
    const partId = `${coreId}_${sectionId}_${pieceId}`
    const extension = 'factor_1to001.abundance.local.png'

    const paths = minerals.map((_, mineralIndex) => {
        const mineralId = padZeros(mineralIndex, 2)
        return `./data/${core}/parts/${partId}_${mineralId}.${extension}`
    })

    return paths
}

export default SinglePart

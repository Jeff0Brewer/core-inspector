import { StringMap, padZeros } from '../lib/util'

const DATA_DIR = 'data-processed'

const ABUNDANCE_EXTENSION = 'factor_1to001.abundance.global.png'

function getCoreId (core: string): string {
    return core.toUpperCase() + 'A'
}

function getPartId (part: string): string {
    const [section, piece] = part.split('_').map(s => parseInt(s))
    const sectionId = padZeros(section, 4) + 'Z'
    const pieceId = padZeros(piece, 3)
    return `${sectionId}_${pieceId}`
}

function getCorePath (core: string, root: string = '.'): string {
    return `${root}/${DATA_DIR}/temp/${core}`
}

function getPartPath (core: string, part: string, root: string = '.'): string {
    const coreId = getCoreId(core)
    const [sectionId, pieceId] = getPartId(part).split('_')
    return `${root}/${DATA_DIR}/${coreId}/${sectionId}/${pieceId}`
}

function getSpectraBasePath (
    core: string,
    part: string,
    spectraType: string,
    root: string = '.'
): string {
    const dir = `${getPartPath(core, part, root)}/spectra/${spectraType}`

    const [section, piece] = part.split('_').map(s => parseInt(s))
    const fileStart = `${core.toUpperCase()}A_${section}Z-${piece}_${spectraType}`

    return `${dir}/${fileStart}`
}

function getSpectraSlicesId (
    imgHeight: number,
    sliceInd: number,
    sliceCount: number
): string {
    const minSlice = sliceInd - (sliceInd % sliceCount)
    const maxSlice = Math.min(minSlice + sliceCount, imgHeight) - 1
    return `${padZeros(minSlice, 4)}-${padZeros(maxSlice, 4)}`
}

function getRgbPath (core: string, part: string, root: string = '.'): string {
    const partPath = getPartPath(core, part, root)
    const coreId = getCoreId(core)
    const partId = getPartId(part)
    return `${partPath}/rgb/${coreId}_${partId}_rgb.png`
}

function getHydrationPath (core: string, part: string, root: string = '.'): string {
    const partPath = getPartPath(core, part, root)
    const coreId = getCoreId(core)
    const partId = getPartId(part)
    return `${partPath}/hydration/${coreId}_${partId}_hydration.png`
}

function getAbundancePaths (
    core: string,
    part: string,
    minerals: Array<string>,
    root: string = '.'
): StringMap<string> {
    const partPath = getPartPath(core, part, root)
    const coreId = getCoreId(core)
    const partId = getPartId(part)

    const paths: StringMap<string> = {}
    minerals.forEach((mineral, i) => {
        const mineralId = padZeros(i, 2)
        paths[mineral] = `${partPath}/${mineralId}/${coreId}_${partId}_${mineralId}.${ABUNDANCE_EXTENSION}`
    })
    return paths
}

export {
    getCoreId,
    getPartId,
    getCorePath,
    getPartPath,
    getSpectraBasePath,
    getSpectraSlicesId,
    getRgbPath,
    getHydrationPath,
    getAbundancePaths
}

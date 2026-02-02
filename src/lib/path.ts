import { StringMap, padZeros } from '../lib/util'

const DATA_DIR = 'data-processed'

function getPartId (part: string): string {
    const [section, piece] = part.split('_').map(s => parseInt(s))
    const sectionId = padZeros(section, 4)
    const pieceId = padZeros(piece, 3)
    return `${sectionId}_${pieceId}`
}

function getCorePath (core: string, root: string = '.'): string {
    return `${root}/${DATA_DIR}/${core}`
}

function getPartPath (core: string, part: string, root: string = '.'): string {
    const [sectionId, pieceId] = getPartId(part).split('_')
    return `${root}/${DATA_DIR}/${core}/fullscale/${sectionId}/${pieceId}`
}

function getSpectraBasePath (
    core: string,
    part: string,
    spectraType: string,
    root: string = '.'
): string {
    const dir = `${getPartPath(core, part, root)}/spectra/${spectraType}`

    const [section, piece] = part.split('_').map(s => parseInt(s))
    const fileStart = `${core}_${section}Z-${piece}_${spectraType}`

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
    const partId = getPartId(part)
    return `${partPath}/rgb/${core}_${partId}_rgb.png`
}

function getHydrationPath (core: string, part: string, root: string = '.'): string {
    const partPath = getPartPath(core, part, root)
    return `${partPath}/hydration/abundance.png`
}

function getAbundancePaths (
    core: string,
    part: string,
    minerals: Array<string>,
    root: string = '.'
): StringMap<string> {
    const partPath = getPartPath(core, part, root)

    const paths: StringMap<string> = {}
    minerals.forEach((mineral, i) => {
        const mineralId = padZeros(i, 2)
        paths[mineral] = `${partPath}/${mineralId}/abundance.png`
    })
    return paths
}

export {
    getPartId,
    getCorePath,
    getPartPath,
    getSpectraBasePath,
    getSpectraSlicesId,
    getRgbPath,
    getHydrationPath,
    getAbundancePaths,
    DATA_DIR
}

import { getCoreId, getPartId } from '../lib/ids'

const DATA_DIR = 'data-processed'

function getCorePath (core: string, root: string = '.'): string {
    return `${root}/${DATA_DIR}/temp/${core}`
}

function getPartPath (core: string, part: string, root: string = '.'): string {
    const coreId = getCoreId(core)
    const [sectionId, pieceId] = getPartId(part).split('_')
    return `${root}/${DATA_DIR}/${coreId}/${sectionId}/${pieceId}`
}

function getSpectraPath (
    core: string,
    part: string,
    spectraType: string,
    root: string = '.'
): string {
    return `${getPartPath(core, part, root)}/spectra/${spectraType}`
}

function getRgbPath (core: string, part: string, root: string = '.'): string {
    const partPath = getPartPath(core, part, root)
    const coreId = getCoreId(core)
    const partId = getPartId(part)
    return `${partPath}/rgb/${coreId}_${partId}_rgb.png`
}

export {
    getCorePath,
    getPartPath,
    getSpectraPath,
    getRgbPath
}

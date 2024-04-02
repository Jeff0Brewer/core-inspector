import { padZeros } from '../lib/util'

const DATA_DIR = 'data-processed'

function getCorePath (core: string, root: string = '.'): string {
    return `${root}/${DATA_DIR}/temp/${core}`
}

function getPartPath (core: string, part: string, root: string = '.'): string {
    const [section, piece] = part.split('_').map(s => parseInt(s))
    const sectionId = padZeros(section, 4) + 'Z'
    const pieceId = padZeros(piece, 3)
    const coreId = core.toUpperCase() + 'A'
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

export {
    getCorePath,
    getPartPath,
    getSpectraPath
}

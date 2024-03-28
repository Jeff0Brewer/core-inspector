import { padZeros } from '../lib/util'

const DATA_DIR = 'data-processed'

function getCorePath (core: string): string {
    return `./${DATA_DIR}/temp/${core}`
}

function getPartPath (core: string, part: string): string {
    const coreId = core.toUpperCase() + 'A'
    const [section, piece] = part.split('_').map(s => parseInt(s))
    const sectionId = padZeros(section, 4) + 'Z'
    const pieceId = padZeros(piece, 3)
    return `./${DATA_DIR}/${coreId}/${sectionId}/${pieceId}`
}

export {
    getCorePath,
    getPartPath
}

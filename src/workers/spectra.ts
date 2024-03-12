import { padZeros, StringMap } from '../lib/util'

type SpectraData = {
    width: number,
    nsamples: number,
    height: number,
    width_reducefactor: number,
    nsamples_reducefactor: number,
    height_reducefactor: number,
    width_reduced: number,
    nsamples_reduced: number,
    height_reduced: number,
    start_slice: number,
    end_slice: number,
    min_value: number,
    max_value: number,
    data: Array<number>
}

const REDUCE_FACTOR = 4
const SLICE_COUNT = 16
const SPECTRA_TYPE = `W${REDUCE_FACTOR}_S1_H${REDUCE_FACTOR}-n${SLICE_COUNT}`

let basePath = ''
let imgHeight = 0
const sliceCache: StringMap<SpectraData> = {}

function getSpectraBasePath (core: string, part: string): string {
    const coreId = `${core.toUpperCase()}A`
    const [section, piece] = part.split('_').map(s => parseInt(s))

    const dir = `/data/temp/${coreId}/${padZeros(section, 4)}Z/${padZeros(piece, 3)}/spectra/${SPECTRA_TYPE}`
    const file = `${coreId}_${padZeros(section, 3)}Z-${piece}_${SPECTRA_TYPE}`
    return `${dir}/${file}`
}

function getSlicesPath (sliceInd: number, imgHeight: number): string {
    const minSlice = sliceInd - (sliceInd % SLICE_COUNT)
    const maxSlice = Math.min(minSlice + SLICE_COUNT, imgHeight) - 1
    return `${padZeros(minSlice, 4)}-${padZeros(maxSlice, 4)}.json`
}

async function getSlices (path: string): Promise<SpectraData> {
    const cached = sliceCache[path]
    if (cached) { return cached }

    const res = await fetch(path)
    const data: SpectraData = await res.json()
    sliceCache[path] = data

    return data
}

onmessage = ({ data }): void => {
    if (data.type === 'id') {
        basePath = getSpectraBasePath(data.core, data.part)
        imgHeight = data.imgHeight
    } else if (data.type === 'mousePosition') {
        const { x, y } = data
        const path = `${basePath}.${getSlicesPath(Math.round(y), imgHeight)}`

        const slices = sliceCache[path]
        if (slices) {
            const rowIndex = Math.round(x / slices.width_reducefactor)
            const colIndex = Math.round((y - slices.start_slice) / slices.height_reducefactor)
            const startInd = (rowIndex + colIndex * slices.width_reduced) * slices.nsamples_reduced
            const spectrum = slices.data
                .slice(startInd, startInd + slices.nsamples_reduced)
                .map(value => (value - slices.min_value) / (slices.max_value - slices.min_value))
            postMessage({ spectrum })
        } else {
            getSlices(path)
        }
    }
}

import { padZeros, clamp, StringMap } from '../lib/util'

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

type SpectraChunk = {
    reduceFactor: number,
    width: number,
    height: number,
    samples: number,
    startSlice: number,
    endSlice: number,
    data: Array<Array<Array<number>>>
}

const REDUCE_FACTOR = 4
const SLICE_COUNT = 16
const SPECTRA_TYPE = `W${REDUCE_FACTOR}_S1_H${REDUCE_FACTOR}-n${SLICE_COUNT}`

let basePath = ''
let imgHeight = 0
const sliceCache: StringMap<SpectraChunk> = {}

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

async function getSlices (path: string): Promise<void> {
    const res = await fetch(path)
    const data: SpectraData = await res.json()

    const chunk: SpectraChunk = {
        reduceFactor: REDUCE_FACTOR,
        width: data.width_reduced,
        height: data.height_reduced,
        samples: data.nsamples_reduced,
        startSlice: data.start_slice,
        endSlice: data.end_slice,
        data: []
    }
    for (let y = 0; y < chunk.height; y++) {
        const ySlices = []
        for (let x = 0; x < chunk.width; x++) {
            const xSlices = []
            for (let i = 0; i < chunk.samples; i++) {
                const ind = x + (i + y * chunk.samples) * chunk.width
                xSlices.push(
                    clamp(
                        (data.data[ind] - data.min_value) / (data.max_value - data.min_value),
                        0,
                        1
                    )
                )
            }
            ySlices.push(xSlices)
        }
        chunk.data.push(ySlices)
    }

    sliceCache[path] = chunk
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
            const { reduceFactor, startSlice, data, width, height } = slices
            const rowIndex = clamp(Math.round(x / reduceFactor), 0, width - 1)
            const colIndex = clamp(Math.round((y - startSlice) / reduceFactor), 0, height - 1)
            const spectrum = data[colIndex][rowIndex]
            if (spectrum) {
                postMessage({ spectrum })
            }
        } else {
            getSlices(path)
            postMessage({ spectrum: [] })
        }
    }
}

import { TextWriter, BlobReader, ZipReader } from '@zip.js/zip.js'
import { padZeros, clamp, StringMap } from '../lib/util'
import { getSpectraPath } from '../lib/path'

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
    data: string
}

type SpectraChunk = {
    reduceFactor: number,
    width: number,
    height: number,
    samples: number,
    startSlice: number,
    endSlice: number,
    data: Uint8Array
}

const REDUCE_FACTOR = 4
const SLICE_COUNT = 16
const SPECTRA_TYPE = `W${REDUCE_FACTOR}_S1_H${REDUCE_FACTOR}-n${SLICE_COUNT}`

let basePath = ''
let imgHeight = 0
let sliceCache: StringMap<SpectraChunk> = {}

function getSpectraBasePath (core: string, part: string): string {
    // TODO: add prod / dev flag to change path root
    const dir = getSpectraPath(core, part, SPECTRA_TYPE, '../..')

    const [section, piece] = part.split('_').map(s => parseInt(s))
    const file = `${core.toUpperCase()}A_${section}Z-${piece}_${SPECTRA_TYPE}`

    return `${dir}/${file}`
}

function getSlicesPath (sliceInd: number, imgHeight: number): string {
    const minSlice = sliceInd - (sliceInd % SLICE_COUNT)
    const maxSlice = Math.min(minSlice + SLICE_COUNT, imgHeight) - 1
    return `${padZeros(minSlice, 4)}-${padZeros(maxSlice, 4)}.HWS.byte-b64.json.zip`
}

function base64ToU8 (base64: string): Uint8Array {
    const binaryString = atob(base64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes
}

async function getZipText (path: string): Promise<string> {
    const res = await fetch(path)
    const blob = await res.blob()

    const blobReader = new BlobReader(blob)
    const zipReader = new ZipReader(blobReader)
    const entries = await zipReader.getEntries()
    const firstEntry = entries.shift()

    if (!firstEntry || !firstEntry.getData) {
        throw new Error('No data in zip file')
    }

    const textWriter = new TextWriter()
    const text = await firstEntry.getData(textWriter)
    zipReader.close()

    return text
}

async function getSlices (path: string): Promise<void> {
    const jsonString = await getZipText(path)
    const data: SpectraData = JSON.parse(jsonString)

    const chunk: SpectraChunk = {
        reduceFactor: REDUCE_FACTOR,
        width: data.width_reduced,
        height: data.height_reduced,
        samples: data.nsamples_reduced,
        startSlice: data.start_slice,
        endSlice: data.end_slice,
        data: base64ToU8(data.data)
    }

    sliceCache[path] = chunk
}

onmessage = ({ data }): void => {
    if (data.type === 'id') {
        basePath = getSpectraBasePath(data.core, data.part)
        imgHeight = data.imgHeight
        sliceCache = {}
    } else if (data.type === 'mousePosition') {
        const { x, y } = data
        const slicePath = getSlicesPath(Math.round(y), imgHeight)
        const path = `${basePath}.${slicePath}`

        const slices = sliceCache[path]
        if (slices) {
            const { reduceFactor, startSlice, data, width, height, samples } = slices
            const rowIndex = clamp(Math.round(x / reduceFactor), 0, width - 1)
            const colIndex = clamp(Math.round((y - startSlice) / reduceFactor), 0, height - 1)
            const startIndex = (colIndex * width + rowIndex) * samples
            const spectrum = data.slice(startIndex, startIndex + samples)
            postMessage({
                spectrum: [...spectrum]
            })
        } else {
            getSlices(path)
            postMessage({ spectrum: [] })
        }
    }
}

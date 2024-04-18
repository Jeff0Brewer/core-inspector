import { TextWriter, BlobReader, ZipReader } from '@zip.js/zip.js'
import { padZeros, clamp, StringMap } from '../lib/util'
import { getSpectraPath } from '../lib/path'

type TypedArray = Uint8Array | Uint16Array

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
    width: number,
    height: number,
    samples: number,
    startSlice: number,
    endSlice: number,
    data: TypedArray
}

const REDUCE_FACTOR = 4
const SLICE_COUNT = 16
const SPECTRA_TYPE = `W${REDUCE_FACTOR}_S1_H${REDUCE_FACTOR}-n${SLICE_COUNT}`
const LOW_RES_EXTENSION = 'HWS.byte-b64.json.zip'
const HIGH_RES_EXTENSION = 'HWS.short-b64.json.zip'

function getSpectraBasePath (core: string, part: string, root: string): string {
    const dir = getSpectraPath(core, part, SPECTRA_TYPE, root)

    const [section, piece] = part.split('_').map(s => parseInt(s))
    const file = `${core.toUpperCase()}A_${section}Z-${piece}_${SPECTRA_TYPE}`

    return `${dir}/${file}`
}

function getSlicesPath (sliceInd: number, imgHeight: number): string {
    const minSlice = sliceInd - (sliceInd % SLICE_COUNT)
    const maxSlice = Math.min(minSlice + SLICE_COUNT, imgHeight) - 1
    return `${padZeros(minSlice, 4)}-${padZeros(maxSlice, 4)}`
}

function base64ToU8 (base64: string): Uint8Array {
    const binaryString = atob(base64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes
}

function base64ToU16 (base64: string): Uint16Array {
    const bytes = base64ToU8(base64)
    return new Uint16Array(bytes.buffer)
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

async function getChunk (path: string, parse: (b64: string) => TypedArray): Promise<SpectraChunk> {
    const jsonString = await getZipText(path)
    const data: SpectraData = JSON.parse(jsonString)
    return {
        width: data.width_reduced,
        height: data.height_reduced,
        samples: data.nsamples_reduced,
        startSlice: data.start_slice,
        endSlice: data.end_slice,
        data: parse(data.data)
    }
}

async function getClickedSpectrum (x: number, y: number, slicePath: string): Promise<void> {
    const path = `${slicePath}.${HIGH_RES_EXTENSION}`
    const chunk = await getChunk(path, base64ToU16)
    const { startSlice, data, width, height, samples } = chunk

    const rowIndex = clamp(Math.round(x / REDUCE_FACTOR), 0, width - 1)
    const colIndex = clamp(Math.round((y - startSlice) / REDUCE_FACTOR), 0, height - 1)
    const startIndex = (colIndex * width + rowIndex) * samples
    const spectrumU16 = data.slice(startIndex, startIndex + samples)
    const spectrum = [...spectrumU16].map(v => v / 65535)
    postMessage({ type: 'clicked', spectrum })
}

function getHoveredSpectrum (x: number, y: number, slicePath: string): void {
    const path = `${slicePath}.${LOW_RES_EXTENSION}`

    const slices = sliceCache[path]
    if (slices) {
        const { startSlice, data, width, height, samples } = slices
        const rowIndex = clamp(Math.round(x / REDUCE_FACTOR), 0, width - 1)
        const colIndex = clamp(Math.round((y - startSlice) / REDUCE_FACTOR), 0, height - 1)
        const startIndex = (colIndex * width + rowIndex) * samples
        const spectrumU8 = data.slice(startIndex, startIndex + samples)
        const spectrum = [...spectrumU8].map(v => v / 255)
        postMessage({ type: 'hovered', spectrum })
    } else {
        cacheSlices(path)
        postMessage({ type: 'hovered', spectrum: [] })
    }
}

const cacheSlices = async (path: string): Promise<void> => {
    const chunk = await getChunk(path, base64ToU8)
    sliceCache[path] = chunk
}

let sliceCache: StringMap<SpectraChunk> = {}
let core = ''
let part = ''
let imgHeight = 0
let x = 0
let y = 0
let basePath = ''
let slicePath = ''

onmessage = ({ data }): void => {
    if (data.type === 'mousePosition') {
        x = data.x
        y = data.y
        slicePath = `${basePath}.${getSlicesPath(Math.round(y), imgHeight)}`
        getHoveredSpectrum(x, y, slicePath)
    } else if (data.type === 'mouseClick') {
        getClickedSpectrum(x, y, slicePath)
    } else if (data.type === 'id') {
        core = data.core
        part = data.part
        imgHeight = data.imgHeight
        // TODO: add prod / dev flag to change path root
        basePath = getSpectraBasePath(core, part, '../..')
        sliceCache = {}
    }
}

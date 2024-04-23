import { TextWriter, BlobReader, ZipReader } from '@zip.js/zip.js'
import { clamp, StringMap } from '../lib/util'
import { getSpectraBasePath, getSpectraSlicesId } from '../lib/path'

type TypedArray = Uint8Array | Uint16Array

// fetched data format
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
    data: string // base64 string encoding bytes or shorts
}

// format of spectra files, contains extension of files and
// helpers for base64 conversion
type Base64Format = {
    fileExtension: string,
    fromBase64: (b64: string) => TypedArray,
    toFloat: (v: number) => number
}

// converted data, chunk of spectra represented as typed array
type SpectraChunk = {
    width: number,
    height: number,
    samples: number,
    startSlice: number,
    endSlice: number,
    data: TypedArray
}

const BYTE_FORMAT: Base64Format = {
    fileExtension: 'HWS.byte-b64.json.zip',
    fromBase64: base64ToU8,
    toFloat: v => v / 255
}

const SHORT_FORMAT: Base64Format = {
    fileExtension: 'HWS.short-b64.json.zip',
    fromBase64: base64ToU16,
    toFloat: v => v / 65535
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

const PATH_ROOT = import.meta.env.MODE === 'production' ? '..' : '../..'
const CLICK_PARSER = import.meta.env.MODE === 'production' ? SHORT_FORMAT : BYTE_FORMAT
const HOVER_PARSER = BYTE_FORMAT
const REDUCE_FACTOR = 4
const SLICE_COUNT = 16
const SPECTRA_TYPE = `W${REDUCE_FACTOR}_S1_H${REDUCE_FACTOR}-n${SLICE_COUNT}`

async function getChunk (
    path: string,
    parse: (b64: string) => TypedArray
): Promise<SpectraChunk> {
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
    const jsonString = await firstEntry.getData(textWriter)

    zipReader.close()

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

function getSpectrum (
    x: number,
    y: number,
    chunk: SpectraChunk,
    toFloat: (v: number) => number
): Array<number> {
    const { startSlice, data, width, height, samples } = chunk

    let colIndex = Math.round((y - startSlice) / REDUCE_FACTOR)
    colIndex = clamp(colIndex, 0, height - 1)

    let rowIndex = Math.round(x / REDUCE_FACTOR)
    rowIndex = clamp(rowIndex, 0, width - 1)

    const startIndex = (colIndex * width + rowIndex) * samples
    const spectrumTyped = data.slice(startIndex, startIndex + samples)

    // convert to float array in range (0, 1)
    return [...spectrumTyped].map(toFloat)
}

async function getClickedSpectrum (
    x: number,
    y: number,
    slicePath: string,
    parser: Base64Format
): Promise<void> {
    const path = `${slicePath}.${parser.fileExtension}`

    const chunk = await getChunk(path, parser.fromBase64)
    const spectrum = getSpectrum(x, y, chunk, parser.toFloat)

    postMessage({
        type: 'clicked',
        spectrum,
        x: Math.round(x),
        y: Math.round(y)
    })
}

function getHoveredSpectrum (
    x: number,
    y: number,
    slicePath: string,
    parser: Base64Format
): void {
    const path = `${slicePath}.${parser.fileExtension}`

    const chunk = sliceCache[path]
    if (chunk) {
        const spectrum = getSpectrum(x, y, chunk, parser.toFloat)
        postMessage({
            type: 'hovered',
            spectrum
        })
    } else {
        cacheSlices(path)
        postMessage({
            type: 'hovered',
            spectrum: []
        })
    }
}

// TODO: send back spectrum of mouse position on chunk load
let sliceCache: StringMap<SpectraChunk> = {}
const cacheSlices = async (path: string): Promise<void> => {
    const chunk = await getChunk(path, base64ToU8)
    sliceCache[path] = chunk
}

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
        const slicesId = getSpectraSlicesId(imgHeight, Math.round(y), SLICE_COUNT)
        slicePath = `${basePath}.${slicesId}`
        getHoveredSpectrum(x, y, slicePath, HOVER_PARSER)
    } else if (data.type === 'mouseClick') {
        getClickedSpectrum(x, y, slicePath, CLICK_PARSER)
    } else if (data.type === 'id') {
        core = data.core
        part = data.part
        imgHeight = data.imgHeight
        sliceCache = {}
        basePath = getSpectraBasePath(core, part, SPECTRA_TYPE, PATH_ROOT)
    }
}

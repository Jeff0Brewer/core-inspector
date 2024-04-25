import { TextWriter, BlobReader, ZipReader } from '@zip.js/zip.js'
import { clamp, StringMap } from '../lib/util'
import { fetchBlob } from '../lib/load'
import { getSpectraBasePath, getSpectraSlicesId } from '../lib/path'

type TypedArray = Uint8Array | Uint16Array
type Point = { x: number, y: number }

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

// fetch spectra file and convert to usable format
async function getChunk (
    path: string,
    parse: (b64: string) => TypedArray
): Promise<SpectraChunk | null> {
    const blob = await fetchBlob(path)
    if (!blob) { return null }

    const blobReader = new BlobReader(blob)
    const zipReader = new ZipReader(blobReader)
    const entries = await zipReader.getEntries()
        .catch(err => {
            console.error(err)
            return null
        })
    if (!entries) { return null }

    const firstEntry = entries.shift()
    if (!firstEntry || !firstEntry.getData) { return null }

    const textWriter = new TextWriter()
    const jsonString = await firstEntry.getData(textWriter)
        .catch(err => {
            console.error(err)
            return null
        })
    if (!jsonString) { return null }

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

// get single spectrum from slice of spectra chunk
function getSpectrum (
    mousePos: Point,
    chunk: SpectraChunk,
    toFloat: (v: number) => number
): Array<number> {
    const { startSlice, data, width, height, samples } = chunk
    const { x, y } = mousePos

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
    mousePos: Point,
    slicePath: string,
    format: Base64Format
): Promise<void> {
    const path = `${slicePath}.${format.fileExtension}`
    const { x, y } = mousePos

    const chunk = await getChunk(path, format.fromBase64)
    if (!chunk) {
        postMessage({
            type: 'clicked',
            spectrum: null,
            x: Math.round(x),
            y: Math.round(y)
        })
        return
    }

    const spectrum = getSpectrum(mousePos, chunk, format.toFloat)
    postMessage({
        type: 'clicked',
        spectrum,
        x: Math.round(x),
        y: Math.round(y)
    })
}

function getHoveredSpectrum (mousePos: Point, slicePath: string, format: Base64Format): void {
    const path = `${slicePath}.${format.fileExtension}`

    if (!(path in sliceCache)) {
        cacheSlices(path, slicePath, format)
        postMessage({ type: 'hovered', spectrum: [] })
        return
    }

    const chunk = sliceCache[path]

    let spectrum: Array<number> | null
    if (chunk === 'loading') {
        spectrum = []
    } else if (chunk === null) {
        spectrum = null
    } else {
        spectrum = getSpectrum(mousePos, chunk, format.toFloat)
    }

    postMessage({ type: 'hovered', spectrum })
}

let sliceCache: StringMap<SpectraChunk | 'loading' | null> = {}
const cacheSlices = async (
    path: string,
    slicePath: string,
    format: Base64Format
): Promise<void> => {
    sliceCache[path] = 'loading'
    const chunk = await getChunk(path, base64ToU8)
    sliceCache[path] = chunk

    // check current mousePos for hit in newly loaded chunk
    getHoveredSpectrum(mousePos, slicePath, format)
}

let basePath = ''
let slicePath = ''
let core = ''
let part = ''
let imgHeight = 0
const mousePos = { x: 0, y: 0 }

onmessage = ({ data }): void => {
    if (data.type === 'mousePosition') {
        mousePos.x = data.x
        mousePos.y = data.y

        const sliceIndex = Math.round(mousePos.y)
        const slicesId = getSpectraSlicesId(imgHeight, sliceIndex, SLICE_COUNT)
        slicePath = `${basePath}.${slicesId}`

        getHoveredSpectrum(
            mousePos,
            slicePath,
            HOVER_PARSER
        )
    } else if (data.type === 'mouseClick') {
        getClickedSpectrum(
            mousePos,
            slicePath,
            CLICK_PARSER
        )
    } else if (data.type === 'id') {
        // clear cached slices from prior part
        sliceCache = {}

        // load information about current section to construct file paths
        core = data.core
        part = data.part
        imgHeight = data.imgHeight
        basePath = getSpectraBasePath(
            core,
            part,
            SPECTRA_TYPE,
            PATH_ROOT
        )
    }
}

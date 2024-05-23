import { StringMap } from '../lib/util'

let pixels: StringMap<Uint8Array | null> = {}
let width: number = 0

onmessage = ({ data }): void => {
    if (data.type === 'init') {
        const imgData: StringMap<ImageData | null> = data.imgData
        const minerals = Object.keys(imgData)
        pixels = {}
        minerals.forEach(mineral => {
            pixels[mineral] = imageDataToMonochromeBytes(imgData[mineral])
        })
        width = data.imgWidth
    } else if (data.type === 'hydration') {
        const imgData: ImageData = data.imgData
        pixels.hydration = imageDataToMonochromeBytes(imgData)
    } else if (data.type === 'mousePosition') {
        const { x, y } = data
        const rowIndex = Math.round(x)
        const colIndex = Math.round(y)
        const index = rowIndex + colIndex * width
        const abundances: StringMap<number> = {}
        Object.entries(pixels).forEach(([mineral, data]) => {
            abundances[mineral] = data !== null
                ? data[index] / 255
                : 0
        })
        postMessage({ abundances })
    }
}

function imageDataToMonochromeBytes (imageData: ImageData | null): Uint8Array | null {
    if (imageData === null) { return null }

    const { data } = imageData
    const bytes = new Uint8Array(data.length / 4)
    for (let i = 0; i < bytes.length; i++) {
        const r = data[i * 4]
        const g = data[i * 4 + 1]
        const b = data[i * 4 + 2]
        bytes[i] = (r + g + b) * 0.333333
    }
    return bytes
}

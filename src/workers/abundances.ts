import { StringMap } from '../lib/util'

let pixels: StringMap<Uint8Array | null> = {}
let width: number = 0

onmessage = ({ data }): void => {
    if (data.type === 'init') {
        const imgData: StringMap<ImageData | null> = data.imgData
        const minerals = Object.keys(imgData)
        pixels = {}
        minerals.forEach(mineral => {
            const data = imgData[mineral]
            pixels[mineral] = data !== null ? imageDataToMonochromeBytes(data) : null
        })
        width = data.imgWidth
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

function imageDataToMonochromeBytes (imageData: ImageData): Uint8Array {
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

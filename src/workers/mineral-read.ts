import { StringMap } from '../lib/util'

let pixels: StringMap<Uint8Array> = {}
let width: number = 0

onmessage = ({ data }): void => {
    if (data.type === 'imgData') {
        const imgData: StringMap<ImageData> = data.imgData
        const minerals = Object.keys(imgData)
        const monochromeData = Object.values(imgData).map(
            imgData => imageDataToMonochromeBytes(imgData)
        )
        pixels = {}
        minerals.forEach((mineral, i) => {
            pixels[mineral] = monochromeData[i]
        })
        width = data.imgWidth
    } else if (data.type === 'mousePosition') {
        const { x, y } = data
        const rowIndex = Math.round(x)
        const colIndex = Math.round(y)
        const index = rowIndex + colIndex * width
        const abundances: StringMap<number> = {}
        Object.entries(pixels).forEach(([mineral, data]) => {
            abundances[mineral] = data[index]
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

import { StringMap } from '../lib/util'

let imgData: StringMap<ImageData> = {}
let imgWidth: number = 0

onmessage = ({ data }): void => {
    if (data.type === 'imgData') {
        imgData = data.imgData
        imgWidth = data.imgWidth
    } else if (data.type === 'mousePosition') {
        const { x, y } = data
        const rowIndex = Math.round(x) * 4
        const colIndex = Math.round(y) * 4
        const index = rowIndex + colIndex * imgWidth
        const abundances: StringMap<number> = {}
        Object.entries(imgData).forEach(([mineral, imgData]) => {
            abundances[mineral] = imgData.data[index]
        })
        postMessage({ abundances })
    }
}

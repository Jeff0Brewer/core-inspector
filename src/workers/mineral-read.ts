type StringMap<T> = { [id: string]: T }

let imgData: StringMap<ImageData> = {}
let imgWidth: number = 0

onmessage = ({ data }): void => {
    if (data.messageType === 'imgData') {
        imgData = data.imgData
        imgWidth = data.imgWidth
    } else if (data.messageType === 'mousePosition') {
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

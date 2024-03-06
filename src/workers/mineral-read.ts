type StringMap<T> = { [id: string]: T }

let imgData: StringMap<ImageData> = {}
let imgWidth: number = 0

onmessage = ({ data }): void => {
    if (data.type === 'imgData') {
        imgData = data.imgData
        const channels = Object.values(imgData)
        if (channels.length !== 0) {
            imgWidth = channels[0].width
        }
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

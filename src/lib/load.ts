// wrap image load event in promise for async use
const loadImageAsync = async (source: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const image = new Image()
        image.src = source
        image.addEventListener('load', (): void => {
            resolve(image)
        })
        image.addEventListener('error', (): void => {
            reject(new Error(`Failed to load image ${source}`))
        })
    })
}

export {
    loadImageAsync
}

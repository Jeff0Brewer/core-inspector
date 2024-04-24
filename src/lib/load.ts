function fetchJson<T> (path: string): Promise<T | null> {
    return fetch(path)
        .then(res => res.json())
        .catch(err => {
            console.error(err)
            return null
        })
}

function fetchBlob (path: string): Promise<Blob | null> {
    return fetch(path)
        .then(res => res.blob())
        .catch(err => {
            console.error(err)
            return null
        })
}

// wrap image load event in promise for async use
async function loadImageAsync (source: string): Promise<HTMLImageElement> {
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
    fetchJson,
    fetchBlob,
    loadImageAsync
}

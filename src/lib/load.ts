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
async function loadImageAsync (source: string): Promise<HTMLImageElement | null> {
    return new Promise((resolve, _reject) => {
        const image = new Image()
        image.src = source
        image.addEventListener('load', (): void => {
            resolve(image)
        })
        image.addEventListener('error', (err): void => {
            console.error(err)
            resolve(null)
        })
    })
}

export {
    fetchJson,
    fetchBlob,
    loadImageAsync
}

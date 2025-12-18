function fetchJson<T> (path: string): Promise<T | null> {
    return fetch(path)
        .then(res => res.json())
        .catch(err => {
            console.error(`Couldn't load path ${path} ${err}`)
            return null
        })
}

function fetchBlob (path: string): Promise<Blob | null> {
    return fetch(path)
        .then(res => res.blob())
        .catch(err => {
            console.error(`Couldn't load path ${path} ${err}`)
            return null
        })
}

// wrap image load event in promise for async use
async function loadImageAsync (path: string): Promise<HTMLImageElement | null> {
    return new Promise((resolve, _reject) => {
        const image = new Image()
        image.src = path
        image.addEventListener('load', (): void => {
            resolve(image)
        })
        image.addEventListener('error', (err): void => {
            console.error(`Couldn't load path ${path} ${err}`)
            resolve(null)
        })
    })
}

export {
    fetchJson,
    fetchBlob,
    loadImageAsync
}

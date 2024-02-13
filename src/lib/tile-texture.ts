type TileRect = {
    left: number,
    top: number,
    width: number,
    height: number
}

type TileTextureMetadata = {
    tiles: Array<TileRect>,
    textureDims: [number, number]
}

export type {
    TileTextureMetadata,
    TileRect
}

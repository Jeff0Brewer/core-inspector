type TileRect = {
    left: number,
    top: number,
    width: number,
    height: number
}

type TileTextureMetadata = {
    tiles: Array<TileRect>,
    numTiles: number,
    totalHeight: number,
    textureWidth: number,
    textureHeight: number
}

export type {
    TileTextureMetadata,
    TileRect
}

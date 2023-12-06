type TileCoords = {
    left: number,
    top: number,
    width: number,
    height: number
}

type TileTextureMetadata = {
    tiles: Array<TileCoords>,
    numTiles: number,
    totalHeight: number,
    textureWidth: number,
    textureHeight: number
}

export type {
    TileTextureMetadata,
    TileCoords
}

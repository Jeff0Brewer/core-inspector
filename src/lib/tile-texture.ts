type TileCoords = {
    top: number,
    left: number,
    right: number,
    bottom: number
}

type TileTextureMetadata = {
    tiles: Array<TileCoords>
}

export type {
    TileTextureMetadata,
    TileCoords
}

type TileRect = {
    left: number,
    top: number,
    width: number,
    height: number
}

type TileTextureMetadata = {
    downTiles: Array<TileRect>,
    punchTiles: Array<TileRect>,
    downDims: [number, number],
    punchDims: [number, number],
    numTiles: number,
}

export type {
    TileTextureMetadata,
    TileRect
}

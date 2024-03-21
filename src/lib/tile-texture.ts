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
    punchNumRows: Array<number>,
    punchTotalRows: number
}

export type {
    TileTextureMetadata,
    TileRect
}

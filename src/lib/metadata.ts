import { StringMap } from '../lib/util'

type DepthInfo = {
    topDepth: number,
    length: number
}

type DepthMetadata = StringMap<DepthInfo>
type HydrationMetadata = StringMap<number>

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
    DepthMetadata,
    HydrationMetadata,
    TileTextureMetadata,
    TileRect
}

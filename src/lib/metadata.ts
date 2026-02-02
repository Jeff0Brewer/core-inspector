import { StringMap } from '../lib/util'

type CoreMetadata = {
    numSection: number,
    topDepth: number,
    bottomDepth: number,
    partIds: Array<string>
}

type HydrationMetadata = StringMap<number>

type DepthInfo = {
    topDepth: number,
    length: number
}

type DepthMetadata = StringMap<DepthInfo>

type TileRect = {
    left: number,
    top: number,
    width: number,
    height: number
}

type TileTextureMetadata = {
    dimensions: [number, number],
    numTiles: number,
    totalHeight: number,
    tiles: Array<TileRect>
}

export type {
    CoreMetadata,
    DepthMetadata,
    HydrationMetadata,
    TileTextureMetadata,
    TileRect
}

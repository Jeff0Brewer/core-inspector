import { StringMap } from '../lib/util'

type TileRect = {
    left: number,
    top: number,
    width: number,
    height: number
}

type TileTextureMetadata = {
    tiles: StringMap<TileRect>,
    textureDims: [number, number],
    numTiles: number
}

export type {
    TileTextureMetadata,
    TileRect
}

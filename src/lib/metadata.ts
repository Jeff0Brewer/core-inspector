import { StringMap } from '../lib/util'

type DepthInfo = {
    topDepth: number,
    length: number
}

type DepthMetadata = StringMap<DepthInfo>
type HydrationMetadata = StringMap<number>

export type {
    DepthMetadata,
    HydrationMetadata
}

type SectionIdMetadata = {
    ids: Array<string>
}

type HydrationMetadata = {
    [id: string]: number
}

type DepthMetadata = {
    [id: string]: {
        topDepth: number,
        length: number
    }
}

export type {
    SectionIdMetadata,
    HydrationMetadata,
    DepthMetadata
}

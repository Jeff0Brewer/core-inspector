type SectionIdMetadata = {
    ids: Array<string>
}

type CoreMetadata = {
    numSection: number,
    topDepth: number,
    bottomDepth: number
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
    CoreMetadata,
    HydrationMetadata,
    DepthMetadata
}

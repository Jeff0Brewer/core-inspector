type ColumnTextureMetadata = {
    width: number,
    heights: Array<number>
}

type ColumnMappedCoord = {
    coord: [number, number],
    breakPercentage: number | null
}

class ColumnTextureMapper {
    columnWidth: number
    heightSearch: Array<number>
    totalHeight: number

    constructor (metadata: ColumnTextureMetadata) {
        this.columnWidth = metadata.width

        // get total height and list of height sums for index search
        this.totalHeight = 0
        this.heightSearch = [0, ...metadata.heights].map(v => {
            this.totalHeight += v
            return this.totalHeight
        })
    }

    getColInd (height: number): number {
        // could do binary search but this is fine for now
        let colInd = 0
        while (this.heightSearch[colInd] < height) {
            colInd++
        }
        return colInd
    }

    get (t: number, nextT?: number): ColumnMappedCoord {
        const tHeight = t * this.totalHeight
        const colInd = this.getColInd(tHeight)

        let breakPercentage = null
        if (nextT !== undefined) {
            const nextTHeight = nextT * this.totalHeight
            const nextColInd = this.getColInd(nextTHeight)

            // if columns change in current segment get value indicating
            // where column change happens so extra verts can be
            // added to prevent texture mapping errors
            if (colInd !== nextColInd) {
                const breakT = this.heightSearch[colInd] / this.totalHeight
                breakPercentage = (breakT - t) / (nextT - t)
            }
        }

        const x = colInd * this.columnWidth
        const y = tHeight - this.heightSearch[colInd - 1]
        return {
            coord: [x, y],
            breakPercentage
        }
    }
}

export default ColumnTextureMapper
export type { ColumnTextureMetadata }

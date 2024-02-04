import { useState, useRef, useEffect, ReactElement } from 'react'
import { loadImageAsync } from '../lib/load'
import { padZeros } from '../lib/util'
import { GenericPalette } from '../lib/palettes'
import '../styles/single-part.css'

type SinglePartProps = {
    part: string | null,
    core: string,
    minerals: Array<string>,
    palettes: Array<GenericPalette>,
    clearPart: () => void
}

function SinglePart (
    { part, core, minerals, palettes, clearPart }: SinglePartProps
): ReactElement {
    const [paths, setPaths] = useState<Array<string>>([])

    useEffect(() => {
        if (!part) { return }

        const [section, piece] = part.split('_').map(str => parseInt(str))
        const paths = getAbundanceFilepaths(core, section, piece, minerals)

        setPaths(paths)
    }, [part, core, minerals])

    if (!part) {
        return <></>
    }
    return <section className={'single-view'}>
        <div className={'top'}></div>
        <div className={'label'}></div>
        <div className={'side'}></div>
        <div className={'content'}></div>
        <div className={'bottom'}></div>
    </section>
}

type MineralCanvasProps = {
    src: string
}

function MineralCanvas (
    { src }: MineralCanvasProps
): ReactElement {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        const ctx = canvas?.getContext('2d')
        if (!canvas || !ctx) {
            throw new Error('No reference to mineral canvas context')
        }

        const initCanvasData = async (
            canvas: HTMLCanvasElement,
            ctx: CanvasRenderingContext2D
        ): Promise<void> => {
            const img = await loadImageAsync(src)
            canvas.width = img.width
            canvas.height = img.height
            ctx.drawImage(img, 0, 0)
        }

        initCanvasData(canvas, ctx)
    }, [src])

    return (
        <canvas ref={canvasRef}></canvas>
    )
}

function getAbundanceFilepaths (
    core: string,
    section: number,
    piece: number,
    minerals: Array<string>
): Array<string> {
    const coreId = core.toUpperCase() + 'A'
    const sectionId = padZeros(section, 4) + 'Z'
    const pieceId = padZeros(piece, 3)
    const partId = `${coreId}_${sectionId}_${pieceId}`
    const extension = 'factor_1to001.abundance.local.png'

    const paths = minerals.map((_, mineralIndex) => {
        const mineralId = padZeros(mineralIndex, 2)
        return `./data/${core}/parts/${partId}_${mineralId}.${extension}`
    })

    return paths
}

export default SinglePart

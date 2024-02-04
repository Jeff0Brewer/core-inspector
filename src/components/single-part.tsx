import { useState, useRef, useEffect, ReactElement } from 'react'
import { PiArrowsHorizontalBold } from 'react-icons/pi'
import { IoMdClose } from 'react-icons/io'
import { IoSearch } from 'react-icons/io5'
import { loadImageAsync } from '../lib/load'
import { padZeros } from '../lib/util'
import { GenericPalette } from '../lib/palettes'
import VerticalSlider from '../components/generic/vertical-slider'
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
    const [zoom, setZoom] = useState<number>(0.5)
    const [spacing, setSpacing] = useState<[number, number]>([0.5, 0.5])
    const contentRef = useRef<HTMLDivElement>(null)
    const labelsRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const content = contentRef.current
        const labels = labelsRef.current
        if (!content || !labels) {
            throw new Error('No reference to layout elements')
        }

        const scroll = (): void => {
            labels.style.left = `${-content.scrollLeft}px`
        }
        content.addEventListener('scroll', scroll)
        return () => {
            content.removeEventListener('scroll', scroll)
        }
    }, [])

    useEffect(() => {
        if (!part) { return }
        setPaths(
            getAbundanceFilepaths(core, part, minerals)
        )
    }, [part, core, minerals])

    if (!part) {
        return <></>
    }
    return <section className={'single-view'}>
        <div className={'top-side'}>
            <button className={'close-button'} onClick={clearPart}>
                {ICONS.close}
            </button>
        </div>
        <div className={'top'}>
            <div className={'section-info'}>
                <p> core <span>{ getCoreId(core) }</span> </p>
                <p> section <span>{ getPartId(part) }</span> </p>
            </div>
        </div>
        <div className={'label'}>
            <div className={'channel-labels'} ref={labelsRef}>
                { minerals.map((mineral, i) =>
                    <div className={'channel-label'} key={i}>
                        {mineral}
                    </div>
                ) }
            </div>
        </div>
        <div className={'content'} ref={contentRef}>
            <div className={'mineral-channels'}>
                { paths.map((path, i) =>
                    <MineralCanvas src={path} key={i} />
                ) }
            </div>
        </div>
        <div className={'side'}>
            <div className={'vertical-controls'}>
                <div className={'zoom-slider'}>
                    <VerticalSlider
                        value={zoom}
                        setValue={setZoom}
                        label={'zoom'}
                        icon={ICONS.zoom}
                        min={0}
                        max={1}
                        step={0.01}
                    />
                </div>
                <VerticalSlider
                    value={spacing[0]}
                    setValue={v => setSpacing([v, spacing[1]])}
                    label={'horizontal distance'}
                    icon={ICONS.horizontalDist}
                    min={0}
                    max={1}
                    step={0.002}
                />
                <VerticalSlider
                    value={spacing[1]}
                    setValue={v => setSpacing([spacing[0], v])}
                    label={'vertical distance'}
                    icon={ICONS.verticalDist}
                    min={0}
                    max={1}
                    step={0.002}
                />
            </div>
        </div>
        <div className={'bottom'}>
            <div className={'mineral-toggles'}>
                { minerals.map((mineral, i) =>
                    <button key={i}>{ mineral }</button>
                ) }
            </div>
        </div>
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
        <canvas className={'mineral-canvas'} ref={canvasRef}></canvas>
    )
}

function getCoreId (core: string): string {
    return core.toUpperCase() + 'A'
}

function getPartId (part: string): string {
    const [section, piece] = part.split('_').map(s => parseInt(s))
    const sectionId = padZeros(section, 4) + 'Z'
    const pieceId = padZeros(piece, 3)
    return `${sectionId}_${pieceId}`
}

function getAbundanceFilepaths (
    core: string,
    part: string,
    minerals: Array<string>
): Array<string> {
    const coreId = getCoreId(core)
    const partId = getPartId(part)
    const fullId = `${coreId}_${partId}`
    const extension = 'factor_1to001.abundance.local.png'

    const paths = minerals.map((_, mineralIndex) => {
        const mineralId = padZeros(mineralIndex, 2)
        return `./data/${core}/parts/${fullId}_${mineralId}.${extension}`
    })

    return paths
}

const ICONS = {
    zoom: <IoSearch style={{ fontSize: '16px' }} />,
    horizontalDist: <div className={'distance-icon'}><PiArrowsHorizontalBold /></div>,
    verticalDist: <div className={'distance-icon'} style={{ transform: 'rotate(90deg)' }}><PiArrowsHorizontalBold /></div>,
    close: <IoMdClose style={{ fontSize: '16px' }} />
}

export default SinglePart

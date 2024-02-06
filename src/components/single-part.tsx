import { useState, useRef, useEffect, ReactElement } from 'react'
import { PiArrowsHorizontalBold } from 'react-icons/pi'
import { MdColorLens } from 'react-icons/md'
import { IoMdClose } from 'react-icons/io'
import { IoSearch } from 'react-icons/io5'
import leftRulerSvg from '../assets/ruler-left.svg'
import rightRulerSvg from '../assets/ruler-right.svg'
import { loadImageAsync } from '../lib/load'
import { useBlendState } from '../components/blend-context'
import { padZeros, StringMap } from '../lib/util'
import { GenericPalette } from '../lib/palettes'
import VerticalSlider from '../components/generic/vertical-slider'
import BlendMenu from '../components/blend-menu'
import SinglePartRenderer from '../vis/single-part'
import '../styles/single-part.css'

type SinglePartProps = {
    part: string,
    core: string,
    minerals: Array<string>,
    palettes: Array<GenericPalette>,
    clearPart: () => void
}

function SinglePart (
    { part, core, minerals, palettes, clearPart }: SinglePartProps
): ReactElement {
    const [vis, setVis] = useState<SinglePartRenderer | null>(null)
    const [paths, setPaths] = useState<StringMap<string>>({})
    const [visible, setVisible] = useState<StringMap<boolean>>({})
    const [zoom, setZoom] = useState<number>(0.5)
    const [spacing, setSpacing] = useState<[number, number]>([0.5, 0.5])
    const [blendMenuOpen, setBlendMenuOpen] = useState<boolean>(false)
    const blendCanvasRef = useRef<HTMLCanvasElement>(null)
    const contentRef = useRef<HTMLDivElement>(null)
    const labelsRef = useRef<HTMLDivElement>(null)
    const {
        magnitudes,
        visibilities,
        palette,
        saturation,
        threshold,
        mode,
        monochrome
    } = useBlendState()

    useEffect(() => {
        if (!part) { return }
        const canvas = blendCanvasRef.current
        if (!canvas) {
            throw new Error('No reference to blend canvas')
        }

        const paths = getAbundanceFilepaths(core, part, minerals)

        const visible: StringMap<boolean> = {}
        minerals.forEach(mineral => {
            visible[mineral] = true
        })

        const initVis = async (): Promise<void> => {
            const minerals = []
            const imgPromises = []
            for (const [mineral, path] of Object.entries(paths)) {
                minerals.push(mineral)
                imgPromises.push(loadImageAsync(path))
            }
            const imgs = await Promise.all(imgPromises)
            canvas.width = imgs[0].width
            canvas.height = imgs[0].height
            setVis(new SinglePartRenderer(canvas, minerals, imgs))
        }

        setPaths(paths)
        setVisible(visible)
        initVis()
    }, [part, core, minerals])

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
        if (!vis) { return }
        vis?.setBlending({
            magnitudes,
            visibilities,
            palette,
            saturation,
            threshold,
            mode,
            monochrome
        })
    }, [vis, palette, magnitudes, visibilities, saturation, threshold, mode, monochrome])

    const currWidth = zoom * 250 + 50

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
            <div
                className={'channel-labels'}
                style={{ gap: `${spacing[0] * currWidth}px` }}
                ref={labelsRef}
            >
                <div
                    className={'channel-label'}
                    style={{
                        minWidth: `${currWidth + 20}px`,
                        maxWidth: `${currWidth + 20}px`
                    }}
                >
                    [blended]
                </div>
                { minerals
                    .filter(mineral => visible[mineral])
                    .map((mineral, i) =>
                        <div
                            className={'channel-label'}
                            style={{
                                minWidth: `${currWidth + 20}px`,
                                maxWidth: `${currWidth + 20}px`
                            }}
                            key={i}
                        >
                            {mineral}
                        </div>
                    ) }
            </div>
        </div>
        <div className={'content'} ref={contentRef}>
            <div
                className={'mineral-channels'}
                style={{ gap: `${spacing[0] * currWidth}px` }}
            >
                <canvas
                    ref={blendCanvasRef}
                    className={'mineral-canvas'}
                    style={{
                        transform: 'scaleY(-1)', // very temporary
                        width: `${currWidth}px`
                    }}
                ></canvas>
                { minerals
                    .filter(mineral => visible[mineral])
                    .map((mineral, i) =>
                        <MineralCanvas
                            src={paths[mineral]}
                            width={currWidth}
                            key={i}
                        />
                    ) }
            </div>
        </div>
        <div className={'side'}>
            <div className={'vertical-controls'}>
                <div className={'scale-ruler'}>
                    <div className={'scale-ruler-center'}>
                        <p>43 cm</p>
                        <div></div>
                        <p>100 px</p>
                    </div>
                </div>
                <div className={'zoom-slider'}>
                    <VerticalSlider
                        value={zoom}
                        setValue={setZoom}
                        label={'zoom'}
                        icon={ICONS.zoom}
                        min={0}
                        max={1}
                        step={0.001}
                    />
                </div>
                <VerticalSlider
                    value={spacing[0]}
                    setValue={v => setSpacing([v, spacing[1]])}
                    label={'horizontal distance'}
                    icon={ICONS.horizontalDist}
                    min={0}
                    max={1}
                    step={0.001}
                />
                <VerticalSlider
                    value={spacing[1]}
                    setValue={v => setSpacing([spacing[0], v])}
                    label={'vertical distance'}
                    icon={ICONS.verticalDist}
                    min={0}
                    max={1}
                    step={0.001}
                />
            </div>
        </div>
        <div className={'bottom'}>
            <div className={'mineral-toggles'}>
                { minerals.map((mineral, i) =>
                    <button
                        onClick={() => {
                            visible[mineral] = !visible[mineral]
                            setVisible({ ...visible })
                        }}
                        data-active={visible[mineral]}
                        key={i}
                    >
                        {mineral}
                    </button>
                ) }
            </div>
            <button
                className={'blend-toggle'}
                data-active={blendMenuOpen}
                onClick={() => setBlendMenuOpen(!blendMenuOpen)}
            >
                <MdColorLens />
            </button>
            { blendMenuOpen && <BlendMenu
                minerals={minerals}
                palettes={palettes}
            /> }
        </div>
    </section>
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
): StringMap<string> {
    const coreId = getCoreId(core)
    const partId = getPartId(part)
    const fullId = `${coreId}_${partId}`
    const extension = 'factor_1to001.abundance.local.png'

    const paths: StringMap<string> = {}

    minerals.forEach((mineral, index) => {
        const mineralId = padZeros(index, 2)
        const path = `./data/${core}/parts/${fullId}_${mineralId}.${extension}`
        paths[mineral] = path
    })

    return paths
}

type MineralCanvasProps = {
    src: string,
    width: number
}

function MineralCanvas (
    { src, width }: MineralCanvasProps
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
        <div className={'channel-wrap'}>
            <img className={'ruler-left'} src={leftRulerSvg} />
            <canvas
                className={'mineral-canvas'}
                style={{ width: `${width}px` }}
                ref={canvasRef}
            ></canvas>
            <img className={'ruler-right'} src={rightRulerSvg} />
        </div>
    )
}

const ICONS = {
    zoom: <IoSearch style={{ fontSize: '16px' }} />,
    horizontalDist: <div className={'distance-icon'}><PiArrowsHorizontalBold /></div>,
    verticalDist: <div className={'distance-icon'} style={{ transform: 'rotate(90deg)' }}><PiArrowsHorizontalBold /></div>,
    close: <IoMdClose style={{ fontSize: '16px' }} />
}

export default SinglePart

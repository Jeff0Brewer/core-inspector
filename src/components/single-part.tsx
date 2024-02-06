import { useState, useRef, useEffect, ReactElement } from 'react'
import { PiArrowsHorizontalBold } from 'react-icons/pi'
import { MdColorLens } from 'react-icons/md'
import { IoMdClose } from 'react-icons/io'
import { IoSearch } from 'react-icons/io5'
import { loadImageAsync } from '../lib/load'
import { useBlendState } from '../components/blend-context'
import { padZeros, StringMap } from '../lib/util'
import { GenericPalette } from '../lib/palettes'
import { DepthMetadata } from '../lib/metadata'
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
    const [visible, setVisible] = useState<StringMap<boolean>>({})
    const [zoom, setZoom] = useState<number>(0.5)
    const [spacing, setSpacing] = useState<number>(0.5)
    const [channelHeight, setChannelHeight] = useState<number>(0)

    useEffect(() => {
        const visible: StringMap<boolean> = {}
        minerals.forEach(mineral => { visible[mineral] = true })
        setVisible(visible)
    }, [part, minerals])

    return <>
        <button className={'close-button'} onClick={clearPart}>
            {ICONS.close}
        </button>
        <div className={'top'}>
            <div className={'section-info'}>
                <p> core <span>{ getCoreId(core) }</span> </p>
                <p> section <span>{ getPartId(part) }</span> </p>
            </div>
        </div>
        <div className={'punch-label'}></div>
        <MineralChannels
            core={core}
            part={part}
            minerals={minerals}
            visible={visible}
            zoom={zoom}
            spacing={spacing}
            setChannelHeight={setChannelHeight}
        />
        <PartViewControls
            core={core}
            part={part}
            zoom={zoom}
            setZoom={setZoom}
            spacing={spacing}
            setSpacing={setSpacing}
            channelHeight={channelHeight}
        />
        <PartMineralControls
            minerals={minerals}
            palettes={palettes}
            visible={visible}
            setVisible={setVisible}
        />
    </>
}

type PartMineralControlsProps = {
    minerals: Array<string>,
    palettes: Array<GenericPalette>,
    visible: StringMap<boolean>,
    setVisible: (v: StringMap<boolean>) => void,
}

function PartMineralControls (
    { minerals, palettes, visible, setVisible }: PartMineralControlsProps
): ReactElement {
    const [menuOpen, setMenuOpen] = useState<boolean>(false)

    return <>
        <div className={'mineral-controls'}>
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
                data-active={menuOpen}
                onClick={() => setMenuOpen(!menuOpen)}
            >
                <MdColorLens />
            </button>
            { menuOpen && <BlendMenu
                minerals={minerals}
                palettes={palettes}
            /> }
        </div>
    </>
}

type PartViewControlsProps = {
    core: string,
    part: string,
    zoom: number,
    setZoom: (z: number) => void,
    spacing: number,
    setSpacing: (s: number) => void,
    channelHeight: number
}

function PartViewControls (
    { core, part, zoom, setZoom, spacing, setSpacing, channelHeight }: PartViewControlsProps
): ReactElement {
    const [depths, setDepths] = useState<DepthMetadata | null>(null)
    const [scale, setScale] = useState<number>(0)

    useEffect(() => {
        const getDepths = async (): Promise<void> => {
            const depthRes = await fetch(`./data/${core}/depth-metadata.json`)
            const { depth } = await depthRes.json()
            setDepths(depth)
        }

        getDepths()
    }, [part, core])

    useEffect(() => {
        if (!depths || !channelHeight) { return }

        const partLengthM = depths[part].length
        const partLengthCm = partLengthM * 100

        setScale(partLengthCm / channelHeight * 100)
    }, [channelHeight, part, depths, zoom])

    return <>
        <div className={'vertical-controls'}>
            <div className={'scale-ruler'}>
                <div className={'scale-ruler-center'}>
                    <p>{scale.toFixed(1)} cm</p>
                    <div></div>
                    <p>100 px</p>
                </div>
            </div>
            <VerticalSlider
                value={zoom}
                setValue={setZoom}
                label={'zoom'}
                icon={ICONS.zoom}
                min={0}
                max={1}
                step={0.01}
            />
            <VerticalSlider
                value={spacing}
                setValue={setSpacing}
                label={'horizontal distance'}
                icon={ICONS.horizontalDist}
                min={0}
                max={1}
                step={0.01}
            />
        </div>
    </>
}

type MineralChannelsProps = {
    core: string,
    part: string,
    minerals: Array<string>,
    visible: StringMap<boolean>,
    zoom: number,
    spacing: number,
    setChannelHeight: (h: number) => void
}

function MineralChannels (
    { core, part, minerals, visible, zoom, spacing, setChannelHeight }: MineralChannelsProps
): ReactElement {
    const [vis, setVis] = useState<SinglePartRenderer | null>(null)
    const [paths, setPaths] = useState<StringMap<string>>({})
    const [channelWidth, setChannelWidth] = useState<number>(0)
    const [imgWidth, setImgWidth] = useState<number>(0)
    const [imgHeight, setImgHeight] = useState<number>(0)
    const {
        magnitudes,
        visibilities,
        palette,
        saturation,
        threshold,
        mode,
        monochrome
    } = useBlendState()
    const blendCanvasRef = useRef<HTMLCanvasElement>(null)
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
            setImgWidth(imgs[0].width)
            setImgHeight(imgs[0].height)
            setVis(new SinglePartRenderer(canvas, minerals, imgs))
        }

        setPaths(paths)
        initVis()
    }, [part, core, minerals])

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

    useEffect(() => {
        const channelWidth = zoom * 250 + 50
        setChannelWidth(channelWidth)
        const canvas = blendCanvasRef.current
        if (canvas) {
            const channelHeight = channelWidth * imgHeight / imgWidth
            setChannelHeight(channelHeight)
        }
    }, [zoom, imgWidth, imgHeight, setChannelHeight])

    return <>
        <div className={'channel-labels-wrap'}>
            <div
                className={'channel-labels'}
                style={{ gap: `${spacing * channelWidth}px` }}
                ref={labelsRef}
            >
                <div
                    className={'channel-label'}
                    style={{
                        minWidth: `${channelWidth}px`,
                        maxWidth: `${channelWidth}px`
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
                                minWidth: `${channelWidth}px`,
                                maxWidth: `${channelWidth}px`
                            }}
                            key={i}
                        >
                            {mineral}
                        </div>
                    ) }
            </div>
        </div>
        <div className={'mineral-channels-wrap'} ref={contentRef}>
            <div
                className={'mineral-channels'}
                style={{ gap: `${spacing * channelWidth}px` }}
            >
                <div className={'channel-wrap'}>
                    <canvas
                        className={'mineral-canvas'}
                        ref={blendCanvasRef}
                        width={imgWidth}
                        height={imgHeight}
                        style={{
                            transform: 'scaleY(-1)', // very temporary
                            width: `${channelWidth}px`
                        }}
                    ></canvas>
                </div>
                { minerals
                    .filter(mineral => visible[mineral])
                    .map((mineral, i) =>
                        <MineralCanvas
                            src={paths[mineral]}
                            width={channelWidth}
                            key={i}
                        />
                    ) }
            </div>
        </div>
    </>
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
            <canvas
                className={'mineral-canvas'}
                style={{ width: `${width}px` }}
                ref={canvasRef}
            ></canvas>
        </div>
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

const ICONS = {
    zoom: <IoSearch style={{ fontSize: '16px' }} />,
    horizontalDist: <div className={'distance-icon'}><PiArrowsHorizontalBold /></div>,
    close: <IoMdClose style={{ fontSize: '16px' }} />
}

export default SinglePart

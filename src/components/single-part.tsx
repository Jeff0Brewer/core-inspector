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
import LoadIcon from '../components/generic/load-icon'
import VerticalSlider from '../components/generic/vertical-slider'
import BlendMenu from '../components/blend-menu'
import SinglePartRenderer from '../vis/single-part'
import '../styles/single-part.css'

type SinglePartViewProps = {
    part: string,
    core: string,
    minerals: Array<string>,
    palettes: Array<GenericPalette>,
    clearPart: () => void
}

function SinglePartView (
    { part, core, minerals, palettes, clearPart }: SinglePartViewProps
): ReactElement {
    const [vis, setVis] = useState<SinglePartRenderer | null>(null)
    const [blendCanvas, setBlendCanvas] = useState<HTMLCanvasElement | null>(null)
    const [channels, setChannels] = useState<StringMap<HTMLCanvasElement>>({})
    const [visible, setVisible] = useState<StringMap<boolean>>({})
    const [zoom, setZoom] = useState<number>(0.5)
    const [spacing, setSpacing] = useState<number>(0.5)
    const [channelHeight, setChannelHeight] = useState<number>(0)

    useEffect(() => {
        const visible: StringMap<boolean> = {}
        minerals.forEach(mineral => { visible[mineral] = true })
        setVisible(visible)

        const getChannels = async (): Promise<void> => {
            const paths = getAbundanceFilepaths(core, part, minerals)
            const imgs = await Promise.all(
                minerals.map(mineral => loadImageAsync(paths[mineral]))
            )

            const channels: StringMap<HTMLCanvasElement> = {}
            minerals.forEach((mineral, i) => {
                channels[mineral] = imgToCanvas(imgs[i])
            })
            setChannels(channels)

            const blendCanvas = document.createElement('canvas')
            setVis(new SinglePartRenderer(blendCanvas, minerals, imgs))
            setBlendCanvas(blendCanvas)
        }

        getChannels()
    }, [core, part, minerals])

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
        <PartMineralChannels
            vis={vis}
            blended={blendCanvas}
            channels={channels}
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

type PartMineralChannelsProps = {
    vis: SinglePartRenderer | null,
    blended: HTMLCanvasElement | null,
    channels: StringMap<HTMLCanvasElement>
    visible: StringMap<boolean>,
    zoom: number,
    spacing: number,
    setChannelHeight: (h: number) => void
}

function PartMineralChannels (
    { vis, blended, channels, visible, zoom, spacing, setChannelHeight }: PartMineralChannelsProps
): ReactElement {
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

    // temp
    useEffect(() => {
        const firstChannel = Object.values(channels)[0]
        if (!firstChannel) {
            return
        }
        setImgWidth(firstChannel.width)
        setImgHeight(firstChannel.height)
    }, [channels])

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
                { Object.keys(channels)
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
        <div
            className={'mineral-channels-wrap'}
            ref={contentRef}
        >
            <LoadIcon loading={!vis} showDelayMs={0} />
            <div
                className={'mineral-channels'}
                style={{ gap: `${spacing * channelWidth}px` }}
                data-visible={!!vis}
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
                { Object.entries(channels)
                    .filter(([mineral, _]) => visible[mineral])
                    .map(([_, canvas], i) =>
                        <MineralCanvas
                            canvas={canvas}
                            width={channelWidth}
                            height={channelWidth * imgHeight / imgWidth}
                            key={i}
                        />
                    ) }
            </div>
        </div>
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

    const toggleMineralVisible = (mineral: string): void => {
        visible[mineral] = !visible[mineral]
        setVisible({ ...visible })
    }

    return (
        <div className={'mineral-controls'}>
            <div className={'mineral-toggles'}>
                { minerals.map((mineral, i) =>
                    <button
                        onClick={() => toggleMineralVisible(mineral)}
                        data-active={visible[mineral]}
                        key={i}
                    >
                        {mineral}
                    </button>
                ) }
            </div>
            <button
                className={'blend-toggle'}
                onClick={() => setMenuOpen(!menuOpen)}
                data-active={menuOpen}
            >
                <MdColorLens />
            </button>
            { menuOpen && <BlendMenu minerals={minerals} palettes={palettes} /> }
        </div>
    )
}

type ScaleRulerProps = {
    core: string,
    part: string,
    channelHeight: number
}

function ScaleRuler (
    { core, part, channelHeight }: ScaleRulerProps
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
    }, [core])

    useEffect(() => {
        if (!depths || !channelHeight) {
            return
        }
        const cmPerPx = (depths[part].length * 100) / channelHeight
        setScale(cmPerPx * 75)
    }, [part, depths, channelHeight])

    return (
        <div className={'scale-ruler'}>
            <div className={'scale-ruler-center'}>
                <p>{scale.toFixed(1)} cm</p>
                <div></div>
                <p>75 px</p>
            </div>
        </div>
    )
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
    return (
        <div className={'vertical-controls'}>
            <ScaleRuler
                core={core}
                part={part}
                channelHeight={channelHeight}
            />
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
    )
}

type MineralCanvasProps = {
    canvas: HTMLCanvasElement,
    width: number,
    height: number
}

function MineralCanvas (
    { canvas, width, height }: MineralCanvasProps
): ReactElement {
    return (
        <div className={'channel-wrap'}>
            <div
                className={'canvas-wrap'}
                style={{
                    width: `${width}px`,
                    height: `${height}px`
                }}
                ref={ref => ref?.appendChild(canvas)}
            ></div>
        </div>
    )
}

function imgToCanvas (img: HTMLImageElement): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) {
        throw new Error('Could not get 2d drawing context')
    }

    canvas.width = img.width
    canvas.height = img.height
    ctx.drawImage(img, 0, 0)

    return canvas
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

export default SinglePartView

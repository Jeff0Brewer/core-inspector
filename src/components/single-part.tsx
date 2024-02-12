import { useState, useRef, useEffect, ReactElement } from 'react'
import { PiArrowsHorizontalBold } from 'react-icons/pi'
import { MdColorLens } from 'react-icons/md'
import { IoMdClose } from 'react-icons/io'
import { IoSearch } from 'react-icons/io5'
import { loadImageAsync } from '../lib/load'
import { useBlending } from '../components/blend-context'
import { padZeros, StringMap } from '../lib/util'
import { GenericPalette } from '../lib/palettes'
import { DepthMetadata } from '../lib/metadata'
import LoadIcon from '../components/generic/load-icon'
import VerticalSlider from '../components/generic/vertical-slider'
import BlendMenu from '../components/blend-menu'
import SinglePartRenderer from '../vis/single-part'
import '../styles/single-part.css'

const BLEND_KEY = '[blended]'

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
    const [channels, setChannels] = useState<StringMap<HTMLCanvasElement>>({})
    const [visible, setVisible] = useState<StringMap<boolean>>({})
    const [zoom, setZoom] = useState<number>(0.5)
    const [spacing, setSpacing] = useState<number>(0.5)

    useBlending(vis)

    useEffect(() => {
        const visible: StringMap<boolean> = { BLEND_KEY: true }
        minerals.forEach(mineral => { visible[mineral] = true })
        setVisible(visible)

        const getChannels = async (): Promise<void> => {
            const paths = getAbundanceFilepaths(core, part, minerals)
            const imgs = await Promise.all(
                minerals.map(mineral => loadImageAsync(paths[mineral]))
            )

            const channels: StringMap<HTMLCanvasElement> = {}

            channels[BLEND_KEY] = document.createElement('canvas')
            channels[BLEND_KEY].width = imgs[0].width
            channels[BLEND_KEY].height = imgs[0].height
            setVis(new SinglePartRenderer(channels[BLEND_KEY], minerals, imgs))

            minerals.forEach((mineral, i) => {
                channels[mineral] = imgToCanvas(imgs[i])
            })

            setChannels(channels)
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
            channels={channels}
            visible={visible}
            zoom={zoom}
            spacing={spacing}
        />
        <PartViewControls
            core={core}
            part={part}
            zoom={zoom}
            setZoom={setZoom}
            spacing={spacing}
            setSpacing={setSpacing}
            channelHeight={channels[BLEND_KEY]?.height || 0}
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
    channels: StringMap<HTMLCanvasElement>,
    visible: StringMap<boolean>,
    zoom: number,
    spacing: number
}

function PartMineralChannels (
    { vis, channels, visible, zoom, spacing }: PartMineralChannelsProps
): ReactElement {
    const [width, setWidth] = useState<string>('0px')
    const [height, setHeight] = useState<string>('0px')
    const [gap, setGap] = useState<string>('0px')
    const contentRef = useRef<HTMLDivElement>(null)
    const labelsRef = useRef<HTMLDivElement>(null)

    // add event listener to coordinate label / content scroll
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

    // get css values for layout from current zoom / spacing
    useEffect(() => {
        const firstChannel = Object.values(channels)[0]
        if (!firstChannel) { return }

        const channelWidth = zoom * 250 + 50

        const { width, height } = firstChannel
        const channelHeight = channelWidth * height / width
        const channelGap = channelWidth * spacing

        setWidth(`${channelWidth}px`)
        setHeight(`${channelHeight}px`)
        setGap(`${channelGap}px`)
    }, [zoom, spacing, channels])

    return <>
        <div className={'channel-labels-wrap'}>
            <div className={'channel-labels'} ref={labelsRef} style={{ gap }}>
                { Object.keys(channels)
                    .filter(mineral => visible[mineral])
                    .map((mineral, i) =>
                        <div className={'channel-label'} style={{ width }} key={i}>
                            {mineral}
                        </div>
                    ) }
            </div>
        </div>
        <div className={'mineral-channels-wrap'} ref={contentRef}>
            <LoadIcon loading={!vis} showDelayMs={0} />
            <div className={'mineral-channels'} style={{ gap }} data-visible={!!vis}>
                { Object.entries(channels)
                    .filter(([mineral, _]) => visible[mineral])
                    .map(([_, canvas], i) =>
                        <MineralCanvas
                            canvas={canvas}
                            width={width}
                            height={height}
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
        if (!depths || !channelHeight) { return }
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
    width: string,
    height: string
}

function MineralCanvas (
    { canvas, width, height }: MineralCanvasProps
): ReactElement {
    // add HTML canvas element to react element via ref,
    // allows access of canvas reference when not rendered to dom
    const addCanvasChild = (ref: HTMLDivElement | null): void => {
        if (!ref) { return }
        while (ref.lastChild) {
            ref.removeChild(ref.lastChild)
        }
        ref.appendChild(canvas)
    }

    return (
        <div className={'channel-wrap'}>
            <div
                className={'canvas-wrap'}
                style={{ width, height }}
                ref={addCanvasChild}
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

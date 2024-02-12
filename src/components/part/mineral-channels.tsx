import { useState, useRef, useEffect, ReactElement } from 'react'
import { BiCross } from 'react-icons/bi'
import { StringMap } from '../../lib/util'
import LoadIcon from '../../components/generic/load-icon'
import PartRenderer from '../../vis/part'
import PartHoverInfo from '../../components/part/hover-info'

// temporary, import from consts file later
const BLEND_KEY = '[blended]'

type PartMineralChannelsProps = {
    vis: PartRenderer | null,
    channels: StringMap<HTMLCanvasElement>,
    visible: StringMap<boolean>,
    zoom: number,
    spacing: number,
    setChannelHeight: (h: number) => void
}

function PartMineralChannels (
    { vis, channels, visible, zoom, spacing, setChannelHeight }: PartMineralChannelsProps
): ReactElement {
    const [imgWidth, setImgWidth] = useState<number>(0)
    const [imgHeight, setImgHeight] = useState<number>(0)
    const [viewWidth, setViewWidth] = useState<number>(0)
    const [viewHeight, setViewHeight] = useState<number>(0)
    const [viewGap, setViewGap] = useState<number>(0)

    const [mousePos, setMousePos] = useState<[number, number] | null>(null)
    const [channelContexts, setChannelContexts] = useState<StringMap<CanvasRenderingContext2D>>({})
    const [abundances, setAbundances] = useState<StringMap<number>>({})

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

        setViewWidth(channelWidth)
        setViewHeight(channelHeight)
        setViewGap(channelGap)

        setChannelHeight(channelHeight)
    }, [zoom, spacing, channels, setChannelHeight])

    useEffect(() => {
        const firstChannel = Object.values(channels)[0]
        if (!firstChannel) { return }

        setImgWidth(firstChannel.width)
        setImgHeight(firstChannel.height)

        const channelContexts: StringMap<CanvasRenderingContext2D> = {}
        Object.entries(channels)
            .filter(([mineral, _]) => mineral !== BLEND_KEY)
            .forEach(([mineral, channel]) => {
                const ctx = channel.getContext('2d', { willReadFrequently: true })
                if (!ctx) {
                    throw new Error('Could not get 2d rendering context')
                }
                channelContexts[mineral] = ctx
            })
        setChannelContexts(channelContexts)
    }, [channels])

    useEffect(() => {
        if (!mousePos) { return }
        const x = mousePos[0] / viewWidth * imgWidth
        const y = mousePos[1] / viewHeight * imgHeight

        const abundances: StringMap<number> = {}
        Object.entries(channelContexts)
            .filter(([mineral, _]) => mineral !== BLEND_KEY)
            .forEach(([mineral, ctx]) => {
                abundances[mineral] = ctx.getImageData(x, y, 1, 1).data[0]
            })
        setAbundances(abundances)
    }, [mousePos, channelContexts, viewWidth, viewHeight, imgWidth, imgHeight])

    const width = `${viewWidth}px`
    const height = `${viewHeight}px`
    const gap = `${viewGap}px`
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
            <PartHoverInfo
                abundances={abundances}
                visible={!!mousePos}
            />
            <div className={'mineral-channels'} style={{ gap }} data-visible={!!vis}>
                { Object.entries(channels)
                    .filter(([mineral, _]) => visible[mineral])
                    .map(([_, canvas], i) =>
                        <MineralCanvas
                            canvas={canvas}
                            width={width}
                            height={height}
                            mousePos={mousePos}
                            setMousePos={setMousePos}
                            key={i}
                        />
                    ) }
            </div>
        </div>
    </>
}

type MineralCanvasProps = {
    canvas: HTMLCanvasElement,
    width: string,
    height: string,
    mousePos: [number, number] | null,
    setMousePos: (p: [number, number] | null) => void
}

function MineralCanvas (
    { canvas, width, height, mousePos, setMousePos }: MineralCanvasProps
): ReactElement {
    const channelRef = useRef<HTMLDivElement>(null)

    // add HTML canvas element to react element via ref,
    // allows access of canvas reference when not rendered to dom
    const addCanvasChild = (ref: HTMLDivElement | null): void => {
        if (!ref) { return }
        while (ref.lastChild) {
            ref.removeChild(ref.lastChild)
        }
        ref.appendChild(canvas)
    }

    useEffect(() => {
        const channel = channelRef.current
        if (!channel) {
            throw new Error('No reference to mineral channel')
        }

        const mousemove = (e: MouseEvent): void => {
            const { top, left } = channel.getBoundingClientRect()
            setMousePos([
                e.clientX - left,
                e.clientY - top
            ])
        }
        const clearMousePos = (): void => {
            setMousePos(null)
        }

        channel.addEventListener('mousemove', mousemove)
        channel.addEventListener('mouseleave', clearMousePos)
        window.addEventListener('wheel', clearMousePos)
        return () => {
            channel.removeEventListener('mousemove', mousemove)
            channel.removeEventListener('mouseleave', clearMousePos)
            window.removeEventListener('wheel', clearMousePos)
        }
    }, [setMousePos])

    return (
        <div className={'channel-wrap'}>
            <div className={'canvas-wrap'} ref={channelRef}>
                { mousePos && <div
                    className={'channel-cursor'}
                    style={{ left: `${mousePos[0]}px`, top: `${mousePos[1]}px` }}
                >
                    {ICONS.cursor}
                </div> }
                <div
                    className={'canvas'}
                    style={{ width, height }}
                    ref={addCanvasChild}
                ></div>
            </div>
        </div>
    )
}

const ICONS = {
    cursor: <BiCross style={{ fontSize: '16px' }} />
}

export default PartMineralChannels

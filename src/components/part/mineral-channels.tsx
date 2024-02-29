import { useState, useRef, useEffect, ReactElement } from 'react'
import { BiCross } from 'react-icons/bi'
import { useCoreMetadata } from '../../hooks/core-metadata-context'
import { StringMap } from '../../lib/util'
import LoadIcon from '../../components/generic/load-icon'
import PartRenderer, { CanvasCtx } from '../../vis/part'
import PartHoverInfo from '../../components/part/hover-info'
import PartViewControls from '../../components/part/view-controls'
import CanvasRenderer from '../../components/generic/canvas-renderer'

type PartMineralChannelsProps = {
    vis: PartRenderer | null,
    part: string,
    channels: StringMap<CanvasCtx>,
    visible: StringMap<boolean>,
    setDepthTop: (d: number) => void,
    setDepthBottom: (d: number) => void,
}

function PartMineralChannels (
    { vis, part, channels, visible, setDepthTop, setDepthBottom }: PartMineralChannelsProps
): ReactElement {
    const [imgWidth, setImgWidth] = useState<number>(0)
    const [imgHeight, setImgHeight] = useState<number>(0)
    const [viewWidth, setViewWidth] = useState<number>(0)
    const [viewHeight, setViewHeight] = useState<number>(0)
    const [viewGap, setViewGap] = useState<number>(0)
    const [zoom, setZoom] = useState<number>(0.25)
    const [spacing, setSpacing] = useState<number>(0.25)
    const [channelHeight, setChannelHeight] = useState<number>(0)

    const [mousePos, setMousePos] = useState<[number, number] | null>(null)
    const [abundances, setAbundances] = useState<StringMap<number>>({})

    const contentRef = useRef<HTMLDivElement>(null)
    const labelsRef = useRef<HTMLDivElement>(null)

    const { depths } = useCoreMetadata()

    // add event listener to coordinate label / content scroll
    useEffect(() => {
        const content = contentRef.current
        const labels = labelsRef.current
        if (!content || !labels) {
            throw new Error('No reference to layout elements')
        }

        const scroll = (): void => {
            // align labels with channel canvases
            labels.style.left = `${-content.scrollLeft}px`

            // get top / bottom view depth for final core panel window
            const scrollTop = content.scrollTop / content.scrollHeight
            const scrollBottom = (content.scrollTop + content.clientHeight) / content.scrollHeight
            const { topDepth, length } = depths[part]
            setDepthTop(scrollTop * length + topDepth)
            setDepthBottom(scrollBottom * length + topDepth)
        }

        scroll()

        content.addEventListener('scroll', scroll)
        return () => {
            content.removeEventListener('scroll', scroll)
        }
    }, [part, depths, channelHeight, setDepthTop, setDepthBottom])

    // get css values for layout from current zoom / spacing
    useEffect(() => {
        if (!vis) { return }

        const channelWidth = zoom * 250 + 50
        const channelGap = channelWidth * spacing
        setViewWidth(channelWidth)
        setViewGap(channelGap)

        const { width, height } = vis.canvas
        if (width) {
            const channelHeight = channelWidth * height / width
            setViewHeight(channelHeight)
            setChannelHeight(channelHeight)
        }
    }, [channels, zoom, spacing, vis, setChannelHeight])

    useEffect(() => {
        if (!vis) { return }
        setImgWidth(vis.canvas.width)
        setImgHeight(vis.canvas.height)
    }, [vis, channels])

    useEffect(() => {
        if (!mousePos) { return }
        const x = mousePos[0] / viewWidth * imgWidth
        const y = mousePos[1] / viewHeight * imgHeight

        const abundances: StringMap<number> = {}
        Object.entries(channels).forEach(([mineral, channel]) => {
            abundances[mineral] = channel.ctx.getImageData(x, y, 1, 1).data[0]
        })
        setAbundances(abundances)
    }, [mousePos, channels, viewWidth, viewHeight, imgWidth, imgHeight])

    const width = `${viewWidth}px`
    const height = `${viewHeight}px`
    const gap = `${viewGap}px`
    return <>
        <PartViewControls
            part={part}
            zoom={zoom}
            setZoom={setZoom}
            spacing={spacing}
            setSpacing={setSpacing}
            channelHeight={channelHeight}
        />
        <div className={'channel-labels-wrap'}>
            <div className={'channel-labels'} ref={labelsRef} style={{ gap }}>
                <div className={'channel-label'} style={{ width }}>
                    [blended]
                </div>
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
            <PartHoverInfo abundances={abundances} visible={!!mousePos} />
            <div className={'mineral-channels'} style={{ gap }} data-visible={!!vis}>
                { vis &&
                    <MineralCanvas
                        canvas={vis.canvas}
                        width={width}
                        height={height}
                        mousePos={mousePos}
                        setMousePos={setMousePos}
                    /> }
                { Object.entries(channels)
                    .filter(([mineral, _]) => visible[mineral])
                    .map(([_, channel], i) =>
                        <MineralCanvas
                            canvas={channel.canvas}
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
                <CanvasRenderer canvas={canvas} width={width} height={height} />
            </div>
        </div>
    )
}

const ICONS = {
    cursor: <BiCross style={{ fontSize: '16px' }} />
}

export default PartMineralChannels

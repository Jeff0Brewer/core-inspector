import { useState, useRef, useEffect, ReactElement } from 'react'
import { BiCross } from 'react-icons/bi'
import { StringMap } from '../../lib/util'
import LoadIcon from '../../components/generic/load-icon'
import PartRenderer, { CanvasCtx } from '../../vis/part'
import PartHoverInfo from '../../components/part/hover-info'

type PartMineralChannelsProps = {
    vis: PartRenderer | null,
    blendChannel: CanvasCtx,
    channels: StringMap<CanvasCtx>,
    visible: StringMap<boolean>,
    zoom: number,
    spacing: number,
    setChannelHeight: (h: number) => void
}

function PartMineralChannels (
    { vis, blendChannel, channels, visible, zoom, spacing, setChannelHeight }: PartMineralChannelsProps
): ReactElement {
    const [imgWidth, setImgWidth] = useState<number>(0)
    const [imgHeight, setImgHeight] = useState<number>(0)
    const [viewWidth, setViewWidth] = useState<number>(0)
    const [viewHeight, setViewHeight] = useState<number>(0)
    const [viewGap, setViewGap] = useState<number>(0)

    const [mousePos, setMousePos] = useState<[number, number] | null>(null)
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
        const { width, height } = blendChannel.canvas
        if (width === 0 || height === 0) { return }

        const channelWidth = zoom * 250 + 50
        const channelHeight = channelWidth * height / width
        const channelGap = channelWidth * spacing

        setViewWidth(channelWidth)
        setViewHeight(channelHeight)
        setViewGap(channelGap)

        setChannelHeight(channelHeight)
    }, [zoom, spacing, blendChannel, setChannelHeight])

    useEffect(() => {
        setImgWidth(blendChannel.canvas.width)
        setImgHeight(blendChannel.canvas.height)
    }, [blendChannel])

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
            <PartHoverInfo
                abundances={abundances}
                visible={!!mousePos}
            />
            <div className={'mineral-channels'} style={{ gap }} data-visible={!!vis}>
                <MineralCanvas
                    canvas={blendChannel.canvas}
                    width={width}
                    height={height}
                    mousePos={mousePos}
                    setMousePos={setMousePos}
                />
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

import { useState, useRef, useEffect, ReactElement } from 'react'
import { StringMap } from '../../lib/util'
import LoadIcon from '../../components/generic/load-icon'
import PartRenderer from '../../vis/part'

type PartMineralChannelsProps = {
    vis: PartRenderer | null,
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
    const [mousePos, setMousePos] = useState<[number, number]>([0, 0])
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
    mousePos: [number, number],
    setMousePos: (p: [number, number]) => void
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
        const mouseleave = (): void => {
            setMousePos([-100, -100])
        }

        channel.addEventListener('mousemove', mousemove)
        channel.addEventListener('mouseleave', mouseleave)
        return () => {
            channel.removeEventListener('mousemove', mousemove)
            channel.removeEventListener('mouseleave', mouseleave)
        }
    }, [setMousePos])

    return (
        <div className={'channel-wrap'}>
            <div className={'canvas-wrap'} ref={channelRef}>
                <div
                    className={'channel-cursor'}
                    style={{ left: `${mousePos[0]}px`, top: `${mousePos[1]}px` }}
                >
                    x
                </div>
                <div
                    className={'canvas'}
                    style={{ width, height }}
                    ref={addCanvasChild}
                ></div>
            </div>
        </div>
    )
}

export default PartMineralChannels

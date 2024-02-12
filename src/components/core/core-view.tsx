import { useState, useEffect, useRef, ReactElement } from 'react'
import { loadImageAsync } from '../../lib/load'
import { GenericPalette } from '../../lib/palettes'
import LoadIcon from '../../components/generic/load-icon'
import CoreRenderer from '../../vis/core'
import CoreVisSettings from '../../components/core/vis-settings'
import CoreViewSliders from '../../components/core/view-sliders'
import CoreMineralControls from '../../components/core/mineral-controls'
import MetadataHover from '../../components/core/metadata-hover'
import PanScrollbar from '../../components/core/pan-scrollbar'
import '../../styles/full-core.css'

type CoreViewProps = {
    cores: Array<string>,
    minerals: Array<string>,
    palettes: Array<GenericPalette>
    core: string,
    setCore: (c: string) => void,
    setPart: (p: string) => void
}

function CoreView (
    { cores, minerals, palettes, core, setCore, setPart }: CoreViewProps
): ReactElement {
    const [vis, setVis] = useState<CoreRenderer | null>(null)
    const frameIdRef = useRef<number>(-1)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        if (!canvasRef.current) {
            throw new Error('No reference to full core canvas')
        }

        const initCoreRenderer = async (canvas: HTMLCanvasElement): Promise<void> => {
            const downscaledPaths = []
            const punchcardPaths = []
            for (let i = 0; i < minerals.length; i++) {
                downscaledPaths.push(`./data/${core}/downscaled/${i}.png`)
                punchcardPaths.push(`./data/${core}/punchcard/${i}.png`)
            }

            const [downscaledImgs, punchcardImgs, tileMetadata, idMetadata] = await Promise.all([
                Promise.all(downscaledPaths.map(path => loadImageAsync(path))),
                Promise.all(punchcardPaths.map(path => loadImageAsync(path))),
                fetch(`./data/${core}/tile-metadata.json`).then(res => res.json()),
                fetch(`./data/${core}/id-metadata.json`).then(res => res.json())
            ])

            setVis(
                new CoreRenderer(
                    canvas,
                    downscaledImgs,
                    punchcardImgs,
                    tileMetadata,
                    idMetadata,
                    minerals
                )
            )
        }

        // free last visualization's gl resources and
        // immediately set to null for loading state
        if (vis) {
            vis.drop()
            setVis(null)
        }

        initCoreRenderer(canvasRef.current)

        // don't want to include vis in dependency array since vis
        // is being set here, will cause loop
        //
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [core, minerals])

    useEffect(() => {
        if (!vis) { return }

        vis.uiState.setPart = setPart

        let lastMs = 0
        const tick = (thisMs: number): void => {
            const elapsedSec = (thisMs - lastMs) * 0.001
            lastMs = thisMs

            vis.draw(elapsedSec)

            frameIdRef.current = window.requestAnimationFrame(tick)
        }

        const removeVisEventListeners = vis.setupEventListeners()
        frameIdRef.current = window.requestAnimationFrame(tick)
        return () => {
            removeVisEventListeners()
            window.cancelAnimationFrame(frameIdRef.current)
        }
    }, [vis, setPart])

    return <>
        <LoadIcon loading={!vis} showDelayMs={0} />
        <canvas
            className={'full-core-canvas'}
            ref={canvasRef}
            data-visible={!!vis}
        ></canvas>
        <CoreVisSettings
            vis={vis}
            cores={cores}
            core={core}
            setCore={setCore}
        />
        <CoreViewSliders vis={vis} />
        <CoreMineralControls
            vis={vis}
            minerals={minerals}
            palettes={palettes}
        />
        <MetadataHover vis={vis} />
        <PanScrollbar vis={vis} />
    </>
}

export default CoreView

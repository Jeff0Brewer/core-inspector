import { useState, useEffect, useRef, ReactElement } from 'react'
import { useRendererDrop } from '../../hooks/renderer-drop'
import { loadImageAsync } from '../../lib/load'
import { getCorePath } from '../../lib/path'
import { GenericPalette } from '../../lib/palettes'
import LoadIcon from '../../components/generic/load-icon'
import CoreRenderer from '../../vis/core'
import CoreVisSettings from '../../components/core/vis-settings'
import CoreViewSliders from '../../components/core/view-sliders'
import CoreMineralControls from '../../components/core/mineral-controls'
import MetadataHover from '../../components/core/metadata-hover'
import PanScrollbar from '../../components/core/pan-scrollbar'
import styles from '../../styles/core/core-view.module.css'

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

    // ensures vis gl resources are freed when renderer changes
    useRendererDrop(vis)

    useEffect(() => {
        if (!canvasRef.current) {
            throw new Error('No reference to full core canvas')
        }

        const initCoreRenderer = async (canvas: HTMLCanvasElement): Promise<void> => {
            const corePath = getCorePath(core)

            const mineralPaths = []
            const punchcardPaths = []
            for (let i = 0; i < minerals.length; i++) {
                mineralPaths.push(`${corePath}/downscaled/${i}.png`)
                punchcardPaths.push(`${corePath}/punchcard/${i}.png`)
            }

            const [mineralImgs, punchcardImgs, tileMetadata, ids] = await Promise.all([
                Promise.all(mineralPaths.map(path => loadImageAsync(path))),
                Promise.all(punchcardPaths.map(path => loadImageAsync(path))),
                fetch(`${corePath}/tile-metadata.json`).then(res => res.json()),
                fetch(`${corePath}/id-metadata.json`).then(res => res.json())
            ])

            setVis(
                new CoreRenderer(
                    canvas,
                    mineralImgs,
                    punchcardImgs,
                    tileMetadata,
                    ids.ids,
                    minerals
                )
            )
        }

        // immediately set to null for loading state
        setVis(null)

        initCoreRenderer(canvasRef.current)
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
        <CoreVisSettings
            vis={vis}
            cores={cores}
            core={core}
            setCore={setCore}
        />
        <CoreViewSliders vis={vis} />
        <canvas
            ref={canvasRef}
            className={`${styles.visCanvas} ${!!vis && styles.visible}`}
        ></canvas>
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

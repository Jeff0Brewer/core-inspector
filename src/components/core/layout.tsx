import React, { useState, useEffect, useRef, ReactElement } from 'react'
import { useRendererDrop } from '../../hooks/renderer-drop'
import { useCoreMetadata } from '../../hooks/core-metadata-context'
import { loadImageAsync } from '../../lib/load'
import { getCorePath } from '../../lib/path'
import { notNull } from '../../lib/util'
import { GenericPalette } from '../../lib/palettes'
import LoadIcon from '../../components/generic/load-icon'
import CoreRenderer from '../../vis/core'
import VisSettings from '../../components/core/vis-settings'
import ViewControls from '../../components/core/view-controls'
import MineralControls from '../../components/core/mineral-controls'
import HoverInfo from '../../components/core/hover-info'
import PanScrollbar from '../../components/core/pan-scrollbar'
import styles from '../../styles/core/layout.module.css'

type CoreViewProps = {
    cores: Array<string>,
    minerals: Array<string>,
    palettes: Array<GenericPalette>
    core: string,
    setCore: (c: string) => void,
    setPart: (p: string) => void
}

const CoreView = React.memo((
    { cores, minerals, palettes, core, setCore, setPart }: CoreViewProps
): ReactElement => {
    const [vis, setVis] = useState<CoreRenderer | null>(null)
    const [loadError, setLoadError] = useState<boolean>(false)
    const frameIdRef = useRef<number>(-1)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const { partIds, tiles } = useCoreMetadata()

    // ensures vis gl resources are freed when renderer changes
    useRendererDrop(vis)

    useEffect(() => {
        setVis(null)
        setLoadError(false)

        if (!partIds || !tiles) { return }
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

            const [mineralImgs, punchcardImgs] = await Promise.all([
                Promise.all(mineralPaths.map(path => loadImageAsync(path))),
                Promise.all(punchcardPaths.map(path => loadImageAsync(path)))
            ])

            // check if all images loaded
            const loadedMineralImgs = mineralImgs.filter(notNull)
            const loadedPunchcardImgs = punchcardImgs.filter(notNull)
            if (
                loadedMineralImgs.length !== mineralImgs.length ||
                loadedPunchcardImgs.length !== punchcardImgs.length
            ) {
                setLoadError(true)
                return
            }

            setVis(
                new CoreRenderer(
                    canvas,
                    loadedMineralImgs,
                    loadedPunchcardImgs,
                    tiles,
                    partIds,
                    minerals
                )
            )
        }

        initCoreRenderer(canvasRef.current)
    }, [core, minerals, partIds, tiles])

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
        <LoadIcon loading={!vis && !loadError} showDelayMs={0} />
        { !loadError && <>
            <VisSettings
                vis={vis}
                cores={cores}
                core={core}
                setCore={setCore}
            />
            <ViewControls vis={vis} />
            <canvas
                ref={canvasRef}
                className={`${styles.visCanvas} ${!!vis && styles.visible}`}
            ></canvas>
            <MineralControls
                vis={vis}
                minerals={minerals}
                palettes={palettes}
            />
            <HoverInfo vis={vis} />
            <PanScrollbar vis={vis} />
        </> }
        { loadError &&
            <p className={styles.dataMissing}>
                data missing
            </p> }
    </>
})

export default CoreView

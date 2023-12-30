import { useState, useRef, useEffect, ReactElement } from 'react'
import { MdRemoveRedEye, MdColorLens } from 'react-icons/md'
import { IoCaretDownSharp } from 'react-icons/io5'
import { clamp } from '../lib/util'
import { VIS_DEFAULTS } from '../vis/vis'
import '../styles/mineral-blend.css'

type MineralBlenderProps = {
    mineral: string,
    setBlend: (m: number) => void
}

function MineralBlender (
    { mineral, setBlend }: MineralBlenderProps
): ReactElement {
    const [percentage, setPercentage] = useState<number>(VIS_DEFAULTS.mineral.blendMagnitude)
    const [dragging, setDragging] = useState<boolean>(false)
    const sliderRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const slider = sliderRef.current
        if (!slider) { throw new Error('No reference to slider') }

        const updatePercentage = (e: MouseEvent): void => {
            const { left, right } = slider.getBoundingClientRect()
            const dx = e.clientX - left
            const width = right - left
            const clickPercentage = clamp(dx / width, 0, 1)

            setPercentage(clickPercentage)
            setBlend(clickPercentage)
        }

        if (!dragging) {
            const mousedown = (e: MouseEvent): void => {
                updatePercentage(e)
                setDragging(true)
            }
            // attach only mousedown event to slider so drag
            // can extend past slider bounds once started
            slider.addEventListener('mousedown', mousedown)
            return () => {
                slider.removeEventListener('mousedown', mousedown)
            }
        }

        const mouseup = (): void => { setDragging(false) }
        const mouseleave = (): void => { setDragging(false) }
        const mousemove = (e: MouseEvent): void => { updatePercentage(e) }
        window.addEventListener('mouseup', mouseup)
        window.addEventListener('mouseleave', mouseleave)
        window.addEventListener('mousemove', mousemove)
        return () => {
            window.removeEventListener('mouseup', mouseup)
            window.removeEventListener('mouseleave', mouseleave)
            window.removeEventListener('mousemove', mousemove)
        }
    }, [dragging, setBlend])

    return (
        <div className={'mineral-blender'}>
            <div className={'mineral-blender-top'}>
                <a><MdRemoveRedEye /></a>
                <p>{mineral}</p>
            </div>
            <div ref={sliderRef} className={'slider-wrap'}>
                { dragging && <div
                    className={'slider-arrow'}
                    style={{ left: `${percentage * 100}%` }}
                >
                    <IoCaretDownSharp />
                </div> }
                <div
                    className={'slider-value'}
                    style={{ width: `${percentage * 100}%` }}
                ></div>
            </div>
        </div>
    )
}

type MineralBlendProps = {
    minerals: Array<string>,
    currMineral: number,
    setMineral: (i: number) => void,
    setBlending: (i: number, m: number) => void
}

function MineralBlend (
    { minerals, currMineral, setMineral, setBlending }: MineralBlendProps
): ReactElement {
    const [open, setOpen] = useState<boolean>(false)

    // close blend menu if not currently using blended output
    useEffect(() => {
        if (currMineral >= 0) {
            setOpen(false)
        }
    }, [currMineral])

    return (
        <div className={'blend-menu'}>
            <button
                onClick={() => {
                    setMineral(-1)
                    setOpen(!open)
                }}
                data-active={currMineral < 0}
            >
                <MdColorLens />
            </button>
            { open && <div>
                { minerals.map((name, i) => (
                    <MineralBlender
                        key={i}
                        mineral={name}
                        setBlend={(m: number) => { setBlending(i, m) }}
                    />
                )) }
            </div> }
        </div>
    )
}

export default MineralBlend

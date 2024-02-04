import { ReactElement } from 'react'
import { GenericPalette } from '../lib/palettes'

type SinglePartProps = {
    part: string | null,
    core: string,
    minerals: Array<string>,
    palettes: Array<GenericPalette>,
    clearPart: () => void
}

function SinglePart (
    { part, core, minerals, palettes, clearPart }: SinglePartProps
): ReactElement {
    if (!part) {
        return <></>
    }
    return <div>
        <button onClick={clearPart}>clear</button>
        <p>core: { core } part: { part }</p>
    </div>
}

export default SinglePart

import { useEffect } from 'react'

import CoreRenderer from '../vis/core'
import PartRenderer from '../vis/part'

// ensures renderer's gl resources are freed on destruction
function useRendererDrop (renderer: CoreRenderer | PartRenderer | null): void {
    // watch changes to renderer with useEffect
    useEffect(() => {
        // return closure to call on renderer destruction
        return () => {
            // drop resources if renderer isn't null
            if (renderer) {
                renderer.drop()
            }
        }
    }, [renderer])
}

export { useRendererDrop }

import { useState, useEffect, ReactElement } from 'react'
import { CoreMetadata } from '../lib/metadata'
import Dropdown from '../components/dropdown'
import '../styles/core-select.css'

const SECTION_PAD_LEN = 4

function padZeros (n: number, len: number): string {
    const str = n.toString()
    if (str.length > len) {
        return str
    }
    const zeros = Array(len - str.length).fill('0').join('')
    return zeros + str
}

type CoreSelectProps = {
    cores: Array<string>,
    selected: string,
    setSelected: (c: string) => void
}

function CoreSelect (
    { cores, selected, setSelected }: CoreSelectProps
): ReactElement {
    const [data, setData] = useState<CoreMetadata | null>(null)
    useEffect(() => {
        const getData = async (): Promise<void> => {
            const basePath = `./data/${selected}`
            const data = (await fetch(`${basePath}/core-metadata.json`)
                .then(res => res.json())) as CoreMetadata
            setData(data)
        }
        getData()
    }, [selected])

    return (
        <div className={'core-select'}>
            <p>core</p>
            <Dropdown
                items={cores}
                selected={selected}
                setSelected={setSelected}
                customClass={'core-dropdown'}
            />
            { data && <>
                <p>
                sections
                    <span>
                        {padZeros(1, SECTION_PAD_LEN)} - {padZeros(data.numSection, SECTION_PAD_LEN)}
                    </span>
                </p>
                <p>
                    depth
                    <span>
                        {data.topDepth}m - {data.bottomDepth}m
                    </span>
                </p>
            </>}
        </div>
    )
}

export default CoreSelect
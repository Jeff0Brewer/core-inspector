import { vec3 } from 'gl-matrix'

type UnlabelledColors = Array<vec3>
type LabelledColors = { [mineral: string]: vec3 }
type GenericColors = LabelledColors | UnlabelledColors

type LabelledPalette = { type: 'labelled', colors: LabelledColors }
type UnlabelledPalette = { type: 'unlabelled', colors: UnlabelledColors }
type GenericPalette = LabelledPalette | UnlabelledPalette

function colorsToPalettes (colorsList: Array<GenericColors>): Array<GenericPalette> {
    return colorsList.map(colors => {
        if (Array.isArray(colors)) {
            return { type: 'unlabelled', colors }
        } else {
            return { type: 'labelled', colors }
        }
    })
}

const COLOR_PRESETS: Array<GenericPalette> = colorsToPalettes([
    {
        chlorite: [0.6039, 0.6588, 0.5647],
        epidote: [0.6705, 0.7411, 0.6823],
        prehnite: [0.4156, 0.4745, 0.5764],
        zeolite: [1, 1, 1],
        amphibole: [0.8, 0.7843, 0.6941],
        pyroxene: [0.8039, 0.8509, 0.8666],
        gypsum: [0.4431, 0.5960, 0.3333],
        carbonate: [0.4705, 0.3450, 0.5882]
    }, {
        chlorite: [0.2470, 0.6549, 0.8392],
        prehnite: [0.8039, 0.3490, 0.5647],
        zeolite: [0.9686, 0.6156, 0.5176],
        carbonate: [0.9803, 0.7529, 0.3686],
        'kaolinite-montmorillinite': [0.9333, 0.3882, 0.3215]
    }, [
        [0.4705, 0.3450, 0.5882],
        [0.6705, 0.7411, 0.6862],
        [0.4156, 0.4745, 0.5764]
    ], [
        [0.3803, 0.2313, 0.3529],
        [0.5372, 0.3764, 0.5568],
        [0.7294, 0.5843, 0.5764],
        [0.9294, 0.9764, 0.6666],
        [0.7843, 0.9803, 0.7411]
    ], [
        [0.9647, 0.4274, 0.6078],
        [0.3921, 0.4549, 0.8039],
        [0.3019, 0.7529, 0.7098],
        [0.2039, 0.5647, 0.8627],
        [0.2196, 0.7568, 0.4470],
        [0.5843, 0.3803, 0.8862],
        [0.8901, 0.2039, 0.1843],
        [0.9647, 0.6, 0.2470],
        [1, 0.9294, 0.2901]
    ]
])

export { COLOR_PRESETS }
export type { GenericPalette }

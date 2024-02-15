attribute vec4 position;
attribute vec2 texCoord;

uniform float pointSize;
uniform vec2 binSize;
uniform sampler2D mineral;

varying vec3 vColor;

const float numSample = 5.0;
const float invNumSample = 1.0 / (numSample - 1.0);
const float invSize = 1.0 / (numSample * numSample);

void main () {
    gl_Position = position;
    gl_PointSize = pointSize;

    vec4 color = vec4(0.0, 0.0, 0.0, 0.0);
    for (float i = 0.0; i < numSample; i += 1.0) {
        for (float j = 0.0; j < numSample; j += 1.0) {
            vec2 offset = vec2(
                binSize.x * (i * invNumSample - 0.5),
                binSize.y * (j * invNumSample - 0.5)
            );
            color += invSize * texture2D(mineral, texCoord + offset);
        }
    }

    vColor = color.xyz;
}

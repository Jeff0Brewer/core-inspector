attribute vec4 spiralPos;
attribute vec4 columnPos;
attribute vec2 texCoord;

uniform mat4 proj;
uniform mat4 view;
uniform float shapeT;
uniform float windowHeight;
uniform float pointSize;
uniform vec2 binSize;
uniform sampler2D mineral;

varying vec3 vColor;

const float numSample = 5.0;
const float invNumSample = 1.0 / (numSample - 1.0);
const float invSize = 1.0 / (numSample * numSample);

void main() {
    vec4 position = spiralPos * shapeT + columnPos * (1.0 - shapeT);
    gl_Position = proj * view * position;

    float windowScale = windowHeight * 0.00115;
    gl_PointSize = pointSize * windowScale / gl_Position.w;

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

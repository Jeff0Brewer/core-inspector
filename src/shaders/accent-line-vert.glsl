attribute vec4 spiralPos;
attribute vec4 columnPos;
attribute float lineLength;

uniform mat4 proj;
uniform mat4 view;
uniform float shapeT;

varying float vLineLength;
varying vec4 vColor;

void main() {
    vec4 position = spiralPos * shapeT + columnPos * (1.0 - shapeT);
    gl_Position = proj * view * position;

    vLineLength = lineLength;
    vColor = mix(
        vec4(0.58, 0.46, 0.28, 0.9),
        vec4(0.34, 0.45, 0.59, 0.7),
        smoothstep(1.0, 1.0, lineLength)
    );
}

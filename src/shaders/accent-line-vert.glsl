attribute vec4 spiralPos;
attribute vec4 columnPos;
attribute float lineLength;

uniform mat4 proj;
uniform mat4 view;
uniform float shapeT;

varying float vLineLength;
varying vec3 vColor;

void main() {
    vec4 position = spiralPos * shapeT + columnPos * (1.0 - shapeT);
    gl_Position = proj * view * position;

    vLineLength = lineLength;
    vColor = mix(
        vec3(0.58, 0.46, 0.28),
        vec3(0.34, 0.45, 0.59),
        smoothstep(1.0, 1.0, lineLength)
    );
}

attribute vec4 spiralPos;
attribute vec4 columnPos;
attribute float lineLength;

uniform mat4 proj;
uniform mat4 view;
uniform float shapeT;

varying float vLineLength;

void main() {
    vec4 position = spiralPos * shapeT + columnPos * (1.0 - shapeT);
    gl_Position = proj * view * position;

    vLineLength = lineLength;
}

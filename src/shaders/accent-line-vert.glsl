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

    float isColumn = 1.0 - shapeT;
    vec4 sideColor = vec4(0.4, 0.5, 0.65, 1.0 * isColumn);
    vec4 bottomColor = vec4(0.6, 0.5, 0.3, 1.0);

    // switch between colors for side / bottom lines
    // any vertices with negative lengths are known to be bottom lines
    vColor = lineLength < 0.0 ? bottomColor : sideColor;
}

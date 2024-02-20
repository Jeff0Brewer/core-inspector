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
    vec4 sideColor = vec4(0.8745, 0.8313, 0.8824, 0.6 * isColumn);
    vec4 bottomColor = vec4(0.8235, 0.8667, 0.7725, 1.0);

    // switch between colors for side / bottom lines
    // any vertices with negative lengths are known to be bottom lines
    vColor = lineLength < 0.0 ? bottomColor : sideColor;
}

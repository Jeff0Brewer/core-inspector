attribute vec4 spiralPos;
attribute vec4 columnPos;
attribute vec2 color;

uniform mat4 proj;
uniform mat4 view;
uniform float shapeT;

varying vec4 vColor;

void main() {
    vec4 position = spiralPos * shapeT + columnPos * (1.0 - shapeT);
    gl_Position = proj * view * position;
    vColor = vec4(color, 0.0, 1.0);
}

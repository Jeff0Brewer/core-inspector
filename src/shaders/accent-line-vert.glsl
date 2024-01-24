attribute vec4 spiralPos;
attribute vec4 columnPos;

uniform mat4 proj;
uniform mat4 view;
uniform float shapeT;

void main() {
    vec4 position = spiralPos * shapeT + columnPos * (1.0 - shapeT);
    gl_Position = proj * view * position;
}

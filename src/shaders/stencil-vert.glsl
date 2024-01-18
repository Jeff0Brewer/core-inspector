attribute vec4 position;
attribute vec2 color;

uniform mat4 proj;
uniform mat4 view;
uniform float shapeT;

varying vec4 vColor;

void main() {
    gl_Position = proj * view * position;
    vColor = vec4(color, 0.0, 1.0);
}

attribute vec4 position;

uniform mat4 proj;
uniform mat4 view;

void main() {
    gl_Position = proj * view * position;
}

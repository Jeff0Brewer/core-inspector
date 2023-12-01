attribute vec4 position;
attribute vec2 texCoord;

uniform mat4 proj;
uniform mat4 view;

varying vec2 vTexCoord;

void main() {
    gl_Position = proj * view * position;
    vTexCoord = texCoord;
}

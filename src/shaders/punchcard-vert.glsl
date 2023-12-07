attribute vec4 spiralPos;
attribute vec4 columnPos;
attribute vec2 texCoord;

uniform mat4 proj;
uniform mat4 view;
uniform float shapeT;
uniform float dpr;

varying vec2 vTexCoord;

void main() {
    vec4 position = spiralPos * shapeT + columnPos * (1.0 - shapeT);
    gl_Position = proj * view * position;
    vTexCoord = texCoord;
    gl_PointSize = 2.0 * dpr / gl_Position.w;
}

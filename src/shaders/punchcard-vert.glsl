attribute vec4 spiralPos;
attribute vec4 columnPos;
attribute vec2 texCoord;

uniform mat4 proj;
uniform mat4 view;
uniform float shapeT;
uniform float windowHeight;
uniform float pointSize;

varying vec2 vTexCoord;

void main() {
    vec4 position = spiralPos * shapeT + columnPos * (1.0 - shapeT);
    gl_Position = proj * view * position;
    vTexCoord = texCoord;
    float windowScale = windowHeight * 0.00115;
    gl_PointSize = pointSize * windowScale / gl_Position.w;
}

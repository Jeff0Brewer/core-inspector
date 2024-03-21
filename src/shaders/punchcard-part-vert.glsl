attribute vec4 position;
attribute vec2 texCoord;

uniform float pointSize;
uniform vec2 binSize;
uniform float offsetX;

varying vec2 vTexCoord;

void main () {
    vec4 offsetPos = position;
    offsetPos.x += offsetX;

    gl_Position = offsetPos;
    gl_PointSize = pointSize;

    vTexCoord = texCoord;
}

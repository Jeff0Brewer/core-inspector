attribute vec4 position;
attribute vec2 texCoord;

uniform float pointSize;
uniform vec2 binSize;
uniform float offsetX;
uniform float binX;
uniform sampler2D minerals;

varying vec3 vColor;

void main () {
    vec4 offsetPos = position;
    offsetPos.x += offsetX;
    gl_Position = offsetPos;

    gl_PointSize = pointSize;

    vec4 color0 = texture2D(minerals, texCoord);
    vec4 color1 = texture2D(minerals, texCoord + binX);
    vec4 color2 = texture2D(minerals, texCoord - binX);
    vColor = (color0.xyz + color1.xyz + color2.xyz) * 0.33333;
}

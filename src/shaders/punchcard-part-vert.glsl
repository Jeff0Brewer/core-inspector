attribute vec4 position;
attribute vec2 texCoord;

uniform float pointSize;
uniform sampler2D mineral;

varying vec3 vColor;

void main () {
    gl_Position = position;
    gl_PointSize = pointSize;

    vColor = texture2D(mineral, texCoord).xyz;
}

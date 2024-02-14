attribute vec4 position;
attribute vec2 texCoord;

uniform sampler2D mineral;

varying vec3 vColor;

void main () {
    gl_Position = position;

    vColor = texture2D(mineral, texCoord).xyz;
}

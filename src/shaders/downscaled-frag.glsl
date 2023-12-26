precision highp float;

uniform sampler2D mineral;

varying vec2 vTexCoord;

void main() {
    vec4 color = texture2D(mineral, vTexCoord);

    gl_FragColor = color;
}

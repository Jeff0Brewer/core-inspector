precision highp float;

uniform sampler2D mineral;

varying vec2 vTexCoord;

void main() {
    float val = texture2D(mineral, vTexCoord).x;

    gl_FragColor = vec4(val, val, val, 1.0);
}

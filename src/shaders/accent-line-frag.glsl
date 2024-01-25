precision highp float;

varying float vLineLength;
varying vec4 vColor;

void main() {
    float dotted = mod(ceil(vLineLength / 0.1111111111), 2.0);
    gl_FragColor = vColor * dotted;
}

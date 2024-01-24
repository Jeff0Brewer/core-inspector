precision highp float;

varying float vLineLength;

void main() {
    float dotted = mod(ceil(vLineLength / 0.1111111111), 2.0);
    gl_FragColor = vec4(0.6, 0.6, 0.3, dotted);
}

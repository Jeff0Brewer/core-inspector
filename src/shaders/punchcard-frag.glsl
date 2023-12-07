precision highp float;

uniform sampler2D mineral;

varying vec2 vTexCoord;

void main() {
    vec2 cxy = gl_PointCoord * 2.0 - 1.0;
    float radius = dot(cxy, cxy);
    float alpha = 1.0 - smoothstep(0.95, 1.0, radius);

    vec4 color = texture2D(mineral, vTexCoord);
    gl_FragColor = color * alpha;
}

precision highp float;

uniform sampler2D mineral;
uniform float windowHeight;

varying vec2 vTexCoord;

void main() {
    vec2 cxy = gl_PointCoord * 2.0 - 1.0;
    float radius = dot(cxy, cxy);
    float pxSize = 1.0 / windowHeight;
    float alpha = 1.0 - smoothstep(1.0 - pxSize, 1.0, radius);

    vec4 color = texture2D(mineral, vTexCoord);
    gl_FragColor = vec4(color.xyz, alpha);
}

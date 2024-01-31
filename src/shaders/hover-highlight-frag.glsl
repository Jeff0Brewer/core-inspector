precision highp float;

uniform vec2 mousePos;
uniform float windowHeight;

void main() {
    vec2 dist = mousePos - gl_FragCoord.xy;
    float radius = sqrt(dot(dist, dist)) / windowHeight;

    float gradient = 1.0 - smoothstep(0.0, gl_FragCoord.w * 0.2, radius);
    gl_FragColor = vec4(1.0, 1.0, 0.0, 0.1 * gradient + 0.08);
}

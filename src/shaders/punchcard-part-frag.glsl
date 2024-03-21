precision highp float;

uniform float widthScale;
uniform sampler2D minerals;

varying vec2 vTexCoord;

void main () {
    vec2 cxy = gl_PointCoord * 2.0 - 1.0;
    cxy.x *= widthScale;
    float radius = dot(cxy, cxy);
    float alpha = 1.0 - smoothstep(0.95, 1.0, radius);

    vec4 color = texture2D(minerals, vTexCoord);
    gl_FragColor = vec4(color.xyz, alpha);
}

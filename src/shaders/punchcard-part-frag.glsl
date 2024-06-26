precision highp float;

uniform float widthScale;
uniform float pixelSize;
uniform sampler2D minerals;

varying vec3 vColor;

void main () {
    vec2 cxy = gl_PointCoord * 2.0 - 1.0;
    cxy.x *= widthScale;
    float radius = dot(cxy, cxy);
    float alpha = 1.0 - smoothstep(1.0 - pixelSize, 1.0, radius);

    gl_FragColor = vec4(vColor, alpha);
}

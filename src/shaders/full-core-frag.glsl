precision highp float;

uniform sampler2D mineral0;
uniform sampler2D mineral1;
uniform sampler2D mineral2;
uniform sampler2D mineral3;
uniform sampler2D mineral4;
uniform sampler2D mineral5;
uniform sampler2D mineral6;

varying vec2 vTexCoord;


void main() {
    float val0 = texture2D(mineral0, vTexCoord).x;
    float val1 = texture2D(mineral1, vTexCoord).x;
    float val2 = texture2D(mineral2, vTexCoord).x;
    float val3 = texture2D(mineral3, vTexCoord).x;
    float val4 = texture2D(mineral4, vTexCoord).x;
    float val5 = texture2D(mineral5, vTexCoord).x;
    float val6 = texture2D(mineral6, vTexCoord).x;

    float mag = .4;

    vec3 color =
        mag * val0 * vec3(1.0, 0.0, 0.0) +
        mag * val1 * vec3(0.0, 1.0, 0.0) +
        mag * val2 * vec3(0.0, 0.0, 1.0) +
        mag * val3 * vec3(0.5, 0.5, 0.0) +
        mag * val4 * vec3(0.0, 0.5, 0.5) +
        mag * val5 * vec3(0.5, 0.0, 0.5) +
        mag * val6 * vec3(0.3, 0.3, 0.3);

    gl_FragColor = vec4(color, 1.0);
}

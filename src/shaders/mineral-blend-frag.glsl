precision highp float;

varying vec2 vTexCoord;

uniform float saturation;
uniform float threshold;
uniform float mode;

uniform sampler2D texture0;
uniform sampler2D texture1;
uniform sampler2D texture2;
uniform sampler2D texture3;
uniform sampler2D texture4;
uniform sampler2D texture5;
uniform sampler2D texture6;
uniform sampler2D texture7;
uniform sampler2D texture8;

uniform float magnitude0;
uniform float magnitude1;
uniform float magnitude2;
uniform float magnitude3;
uniform float magnitude4;
uniform float magnitude5;
uniform float magnitude6;
uniform float magnitude7;
uniform float magnitude8;

uniform vec3 color0;
uniform vec3 color1;
uniform vec3 color2;
uniform vec3 color3;
uniform vec3 color4;
uniform vec3 color5;
uniform vec3 color6;
uniform vec3 color7;
uniform vec3 color8;

vec3 getMaxColor (
    float value0, float value1, float value2, float value3, float value4,
    float value5, float value6, float value7, float value8
) {
    float maxValue = 0.0;
    maxValue = max(maxValue, value0);
    maxValue = max(maxValue, value1);
    maxValue = max(maxValue, value2);
    maxValue = max(maxValue, value3);
    maxValue = max(maxValue, value4);
    maxValue = max(maxValue, value5);
    maxValue = max(maxValue, value6);
    maxValue = max(maxValue, value7);
    maxValue = max(maxValue, value8);
    return
        float(maxValue == value0) * value0 * color0 +
        float(maxValue == value1) * value1 * color1 +
        float(maxValue == value2) * value2 * color2 +
        float(maxValue == value3) * value3 * color3 +
        float(maxValue == value4) * value4 * color4 +
        float(maxValue == value5) * value5 * color5 +
        float(maxValue == value6) * value6 * color6 +
        float(maxValue == value7) * value7 * color7 +
        float(maxValue == value8) * value8 * color8;
}

vec3 getBlendedColor (
    float value0, float value1, float value2, float value3, float value4,
    float value5, float value6, float value7, float value8
) {
    return
        value0 * color0 +
        value1 * color1 +
        value2 * color2 +
        value3 * color3 +
        value4 * color4 +
        value5 * color5 +
        value6 * color6 +
        value7 * color7 +
        value8 * color8;
}

void main() {
    bool isMaximumMode = abs(mode - 1.0) < 0.001;
    float maxValue = 0.0;

    float abundance0 = texture2D(texture0, vTexCoord).x;
    float abundance1 = texture2D(texture1, vTexCoord).x;
    float abundance2 = texture2D(texture2, vTexCoord).x;
    float abundance3 = texture2D(texture3, vTexCoord).x;
    float abundance4 = texture2D(texture4, vTexCoord).x;
    float abundance5 = texture2D(texture5, vTexCoord).x;
    float abundance6 = texture2D(texture6, vTexCoord).x;
    float abundance7 = texture2D(texture7, vTexCoord).x;
    float abundance8 = texture2D(texture8, vTexCoord).x;

    float value0 = magnitude0 * smoothstep(threshold, 1.0, abundance0);
    float value1 = magnitude1 * smoothstep(threshold, 1.0, abundance1);
    float value2 = magnitude2 * smoothstep(threshold, 1.0, abundance2);
    float value3 = magnitude3 * smoothstep(threshold, 1.0, abundance3);
    float value4 = magnitude4 * smoothstep(threshold, 1.0, abundance4);
    float value5 = magnitude5 * smoothstep(threshold, 1.0, abundance5);
    float value6 = magnitude6 * smoothstep(threshold, 1.0, abundance6);
    float value7 = magnitude7 * smoothstep(threshold, 1.0, abundance7);
    float value8 = magnitude8 * smoothstep(threshold, 1.0, abundance8);

    vec3 color = isMaximumMode
        ? getMaxColor(value0, value1, value2, value3, value4, value5, value6, value7, value8)
        : getBlendedColor(value0, value1, value2, value3, value4, value5, value6, value7, value8);

    gl_FragColor = vec4(color * saturation, 1.0);
}

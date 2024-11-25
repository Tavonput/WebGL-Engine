export class HalftoneShader {
    
    static fragSource =
    `   #version 300 es
        precision mediump float;

        in vec2 vTex;

        out vec4 outColor;

        uniform sampler2D gPosition;
        uniform sampler2D gAlbedo;
        uniform sampler2D gNormal;
        uniform sampler2D gMaterial;
        uniform sampler2D gDepth;
        uniform sampler2D uPostColor;

        uniform float uScale;
        uniform float uSteps;
        uniform float uIntensity;

        void main() {
            float depth = texture(gDepth, vTex).r;
            if (depth >= 1.0)
                discard;

            vec3 albedo = texture(uPostColor, vTex).rgb;

            float luminance = dot(albedo, vec3(0.299, 0.587, 0.114));
            float quantized = floor(luminance * uSteps) / uSteps;

            vec2 screenUV = vTex * vec2(textureSize(uPostColor, 0));
            float pattern = sin(screenUV.x * uScale) * sin(screenUV.y * uScale);

            float halftone = step(pattern, quantized);

            outColor = vec4(mix(albedo, vec3(halftone), uIntensity), 1.0);
        }
    `
}
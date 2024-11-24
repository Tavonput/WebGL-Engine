export class GrayScaleShader {
    /**
     * Quantized gray scale conversion.
     */
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

        uniform float uSteps;

        void main() {
            vec3 albedo = texture(uPostColor, vTex).rgb;

            // NTSC Formula
            float color = dot(albedo, vec3(0.299, 0.587, 0.114));

            color = floor(color * uSteps) / uSteps;

            outColor = vec4(vec3(color), 1.0);
        }
    `
}
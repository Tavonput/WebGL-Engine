export class GrayScaleShader {
    /**
     * Just averages the colors.
     */
    static fragSource =
    `   #version 300 es
        precision mediump float;

        in vec2 vTex;

        out vec4 outColor;

        uniform sampler2D gPosition;
        uniform sampler2D gAlbedo;
        uniform sampler2D gNormal;
        uniform sampler2D gDepth;
        uniform sampler2D uPostColor;

        void main() {
            vec3 albedo = texture(uPostColor, vTex).rgb;
            float color = (albedo.r + albedo.g + albedo.b) / 3.0;

            outColor = vec4(vec3(color), 1.0);
        }
    `
}
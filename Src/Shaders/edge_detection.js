export class EdgeDetectionShader {

    static DETECTION_DEPTH  = 0;
    static DETECTION_ALBEDO = 1;

    /**
     * Performs edge detection on the depth buffer with Sobel filtering.
     */
    static fragSource =
    `   #version 300 es
        precision mediump float;

        #define DETECTION_DEPTH  0
        #define DETECTION_ALBEDO 1

        in vec2 vTex;

        out vec4 outColor;

        uniform sampler2D gPosition;
        uniform sampler2D gAlbedo;
        uniform sampler2D gNormal;
        uniform sampler2D gDepth;
        uniform sampler2D uPostColor;
        
        uniform vec2 uTexelSize;
        uniform vec3 uOutlineColor;
        uniform int uDetectionType;

        const float Gx[9] = float[9](
            -1.0,  0.0,  1.0,
            -2.0,  0.0,  2.0,
            -1.0,  0.0,  1.0
        );

        const float Gy[9] = float[9](
            -1.0, -2.0, -1.0,
            0.0,  0.0,  0.0,
            1.0,  2.0,  1.0
        );

        float sobelFilter(vec2 centerCoord, sampler2D tex) {
            float values[9];
            int idx = 0;

            for (int y = -1; y <= 1; y++) {
                for (int x = -1; x <= 1; x++) {
                    vec2 offset = vec2(float(x), float(y)) * uTexelSize;
                    values[idx++] = texture(tex, centerCoord + offset).r;
                }
            }

            float edgeX = 0.0;
            float edgeY = 0.0;
            for (int i = 0; i < 9; i++) {
                edgeX += Gx[i] * values[i];
                edgeX += Gy[i] * values[i];
            }

            return sqrt(edgeX * edgeX + edgeY * edgeY);
        }

        void main() {
            float edgeStrength;
            if (uDetectionType == DETECTION_DEPTH)
                edgeStrength = sobelFilter(vTex, gDepth);
            else
                edgeStrength = sobelFilter(vTex, uPostColor);

            float threshold = 0.1;
            float outline = smoothstep(threshold, threshold + 0.02, edgeStrength);

            vec3 albedoColor = texture(uPostColor, vTex).rgb;
            outColor = vec4(mix(albedoColor, uOutlineColor, outline), 1.0);

            // Debug
            // if (edgeStrength < threshold)
            //     discard;
            // outColor = vec4(mix(vec3(0.0), 1.0 - uOutlineColor, outline), 1.0);
        }
    `;    
}

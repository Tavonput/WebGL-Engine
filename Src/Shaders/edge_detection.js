// ========================================================================================================================
// Edge Detection Fragment Shader
//
// Performs edge detection on the depth buffer with Sobel filtering.
export const edgeDetectionFragSource =
`   #version 300 es
    precision mediump float;

    in vec2 vTex;

    out vec4 outColor;

    uniform sampler2D albedoTexture;
    uniform sampler2D depthTexture;
    
    uniform vec2 texelSize;
    uniform vec4 outlineColor;

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

    float sobelFilter(vec2 centerCoord) {
        float depthValues[9];
        int idx = 0;

        for (int y = -1; y <= 1; y++) {
            for (int x = -1; x <= 1; x++) {
                vec2 offset = vec2(float(x), float(y)) * texelSize;
                depthValues[idx++] = texture(depthTexture, centerCoord + offset).r;
            }
        }

        float edgeX = 0.0;
        float edgeY = 0.0;
        for (int i = 0; i < 9; i++) {
            edgeX += Gx[i] * depthValues[i];
            edgeX += Gy[i] * depthValues[i];
        }

        return sqrt(edgeX * edgeX + edgeY * edgeY);
    }

    void main() {
        float edgeStrength = sobelFilter(vTex);

        float threshold = 0.1;
        float outline = smoothstep(threshold, threshold + 0.02, edgeStrength);

        vec4 albedoColor = texture(albedoTexture, vTex);
        outColor = mix(albedoColor, outlineColor, outline);

        // Debug
        // outColor = mix(vec4(0.0, 0.0, 0.0, 1.0), 1.0 - outlineColor, outline);
    }
`;
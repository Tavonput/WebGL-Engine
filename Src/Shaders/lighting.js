export class LightingShader {

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

        uniform vec3 uCameraPos;

        uniform vec3 uLightPos;
        uniform vec3 uLightColor;
        uniform float uLightIntensity;

        uniform vec3 uSunDir;
        uniform vec3 uSunColor;

        uniform float uMatAmbient;
        uniform float uMatDiffuse;
        uniform float uMatSpecular;
        uniform float uMatShininess;

        vec3 computeDiffuse(vec3 N, vec3 L, vec3 lightColor, float diff) {
            return diff * lightColor * max(dot(N, L), 0.0);
        }

        vec3 computeSpecular(vec3 N, vec3 L, vec3 V, vec3 lightColor, float specular, float shininess) {
            // if (dot(N, L) <= 0.0)
            //     return vec3(0.0, 0.0, 0.0);

            vec3 R = 2.0 * dot(L, N) * N - L;
            return specular * lightColor * pow(max(dot(R, V), 0.0), shininess);
        }

        void main() {
            float depth = texture(gDepth, vTex).r;
            if (depth >= 1.0)
                discard;

            vec3 albedo = texture(gAlbedo, vTex).rgb;
            vec3 N = texture(gNormal, vTex).xyz;
            vec3 worldPos = texture(gPosition, vTex).xyz;

            vec3 ambient = uMatAmbient * albedo;

            vec3 V = normalize(uCameraPos - worldPos);
            vec3 L = vec3(1.0);

            float distance = length(uLightPos - worldPos);
            float attenuation = uLightIntensity / distance;

            L = normalize(uSunDir);
            vec3 diffuseSun = computeDiffuse(N, L, uSunColor, uMatDiffuse);
            vec3 specularSun = computeSpecular(N, L, V, uSunColor, uMatSpecular, uMatShininess);

            L = normalize(uLightPos - worldPos);
            vec3 diffusePoint = computeDiffuse(N, L, uLightColor, uMatDiffuse) * attenuation;
            vec3 specularPoint = computeSpecular(N, L, V, uLightColor, uMatSpecular, uMatShininess) * attenuation;
            
            outColor = vec4((ambient + diffuseSun + diffusePoint + specularSun + specularPoint), 1.0);
        }
    `;
}
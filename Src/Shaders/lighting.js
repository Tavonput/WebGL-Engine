// ========================================================================================================================
// Vertex Shader
//
export const vertSource =
`   #version 300 es
    precision mediump float;

    in vec3 inPos;
    in vec4 inColor;
    in vec2 inTex;
    in vec3 inNormal;

    out vec3 vWorldPos;
    out vec4 vColor;
    out vec2 vTex;
    out vec3 vNormal;

    uniform mat4 model;
    uniform mat4 view;
    uniform mat4 projection;

    void main() 
    {
        vec4 worldPos = model * vec4(inPos, 1.0);
        gl_Position = projection * view * worldPos;

        vWorldPos = worldPos.xyz;
        vColor = inColor;
        vTex = inTex;

        vNormal = normalize(mat3(model) * inNormal);
    }
`;


// ========================================================================================================================
// Fragment Shader
//
export const fragSource = 
`   #version 300 es
    precision mediump float;

    #define DEBUG_NONE   0
    #define DEBUG_WORLD  1
    #define DEBUG_UV     2
    #define DEBUG_Z      3
    #define DEBUG_NORMAL 4

    in vec3 vWorldPos;
    in vec4 vColor;
    in vec2 vTex;
    in vec3 vNormal;

    out vec4 outColor;

    uniform int debugMode;
    uniform sampler2D tex0;

    uniform vec3 cameraPos;

    uniform vec3 lightPos;
    uniform vec3 lightColor;
    uniform float lightIntensity;

    uniform vec3 sunDir;
    uniform vec3 sunColor;

    uniform float matAmbient;
    uniform float matDiffuse;
    uniform float matSpecular;
    uniform float matShininess;

    vec3 computeDiffuse(vec3 N, vec3 L, vec3 lightColor, float diff) {
        return diff * lightColor * max(dot(N, L), 0.0);
    }

    vec3 computeSpecular(vec3 N, vec3 L, vec3 V, vec3 lightColor, float specular, float shininess) {
        vec3 R = 2.0 * dot(L, N) * N - L;
        return specular * lightColor * pow(max(dot(R, V), 0.0), shininess);
    }

    void main() {
        vec4 albedo = texture(tex0, vTex);

        vec3 ambient = matAmbient * albedo.xyz;

        vec3 N = normalize(vNormal);
        vec3 V = normalize(cameraPos - vWorldPos);
        vec3 L = vec3(1.0);

        float distance = length(lightPos - vWorldPos);
        float attenuation = lightIntensity / distance;

        L = normalize(sunDir);
        vec3 diffuseSun = computeDiffuse(N, L, sunColor, matDiffuse);
        vec3 specularSun = computeSpecular(N, L, V, sunColor, matSpecular, matShininess);

        L = normalize(lightPos - vWorldPos);
        vec3 diffusePoint = computeDiffuse(N, L, lightColor, matDiffuse) * attenuation;
        vec3 specularPoint = computeSpecular(N, L, V, lightColor, matSpecular, matShininess) * attenuation;
        
        outColor = vec4((ambient + diffuseSun + diffusePoint + specularSun + specularPoint), 1.0);
        
        switch (debugMode) {
            case DEBUG_WORLD:
                outColor = vec4(vWorldPos + 1.0 * 0.5, 1.0);
                break;

            case DEBUG_UV:
                outColor = vec4(vTex.xy, 1.0, 1.0);
                break;

            case DEBUG_Z:
                outColor = vec4(vec3(gl_FragCoord.z), 1.0);
                break;

            case DEBUG_NORMAL:
                outColor = vec4(vec3(vNormal), 1.0);
                break;

            case DEBUG_NONE:
            default:
                break;
        }
    }
`;
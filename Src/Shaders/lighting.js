import { ShaderProgram } from "../Core/shaders.js";

export class DirLight {

    constructor(direction = [1.0, 1.0, 1.0], color = [1.0, 1.0, 1.0], intensity = 1.0) {
        this.direction = direction;
        this.color = color;
        this.intensity = intensity;
    }

    /**
     * Upload the uniforms.
     * 
     * @param {WebGL2RenderingContext} gl 
     * @param {ShaderProgram} program 
     * @param {string} uniformPrefix 
     * @param {number} idx
     */
    setUniforms(gl, program, uniformPrefix, idx) {
        program.setUniformVec3f(gl, `${uniformPrefix}[${idx}].direction`, this.direction[0], this.direction[1], this.direction[2]);
        program.setUniformVec3f(gl, `${uniformPrefix}[${idx}].color`, this.color[0], this.color[1], this.color[2]);
        program.setUniformFloat(gl, `${uniformPrefix}[${idx}].intensity`, this.intensity);
    }
}

export class PointLight {

    constructor(position = [1.0, 1.0, 1.0], color = [1.0, 1.0, 1.0], intensity = 1.0) {
        this.position = position;
        this.color = color;
        this.intensity = intensity;
    }

    /**
     * Upload the uniforms.
     * 
     * @param {WebGL2RenderingContext} gl 
     * @param {ShaderProgram} program 
     * @param {string} uniformPrefix 
     * @param {number} idx
     */
    setUniforms(gl, program, uniformPrefix, idx) {
        program.setUniformVec3f(gl, `${uniformPrefix}[${idx}].position`, this.position[0], this.position[1], this.position[2]);
        program.setUniformVec3f(gl, `${uniformPrefix}[${idx}].color`, this.color[0], this.color[1], this.color[2]);
        program.setUniformFloat(gl, `${uniformPrefix}[${idx}].intensity`, this.intensity);
    }
}

export class PhongShader {

    static MAX_DIR_LIGHTS   = 8;
    static MAX_POINT_LIGHTS = 256;

    /**
     * Simple Phong lighting shader.
     */
    static fragSource =
    `   #version 300 es
        precision mediump float;

        #define MAX_DIR_LIGHTS   8
        #define MAX_POINT_LIGHTS 256

        in vec2 vTex;

        out vec4 outColor;

        struct DirLight {
            vec3 direction;
            vec3 color;
            float intensity;
        };

        struct PointLight {
            vec3 position;
            vec3 color;
            float intensity;
        };

        uniform sampler2D gPosition;
        uniform sampler2D gAlbedo;
        uniform sampler2D gNormal;
        uniform sampler2D gMaterial;
        uniform sampler2D gDepth;
        uniform sampler2D uPostColor;

        uniform vec3 uCameraPos;

        uniform DirLight uDirLights[MAX_DIR_LIGHTS];
        uniform PointLight uPointLights[MAX_POINT_LIGHTS];
        uniform int uNumDirLights;
        uniform int uNumPointLights;

        vec3 computeDiffuse(vec3 N, vec3 L, vec3 lightColor, float diff) {
            return diff * lightColor * max(dot(N, L), 0.0);
        }

        vec3 computeSpecular(vec3 N, vec3 L, vec3 V, vec3 lightColor, float specular, float shininess) {
            // if (dot(N, L) <= 0.0)
            //     return vec3(0.0, 0.0, 0.0);

            vec3 R = 2.0 * dot(L, N) * N - L;
            return specular * lightColor * pow(max(dot(R, V), 0.0), shininess);
        }

        vec3 computeDirLight(DirLight light, vec3 N, vec3 V, float matDiffuse, float matSpecular, float matShininess) {
            vec3 L = normalize(light.direction);
            vec3 diffuse = computeDiffuse(N, L, light.color, matDiffuse);
            vec3 specular = computeSpecular(N, L, V, light.color, matSpecular, matShininess);

            return (diffuse + specular) * light.intensity;
        }

        vec3 computePointLight(PointLight light, vec3 N, vec3 V, vec3 fragPos, float matDiffuse, float matSpecular, float matShininess) {
            float distance = length(light.position - fragPos);
            float attenuation = light.intensity / (distance * distance);

            vec3 L = normalize(light.position - fragPos);
            vec3 diffuse = computeDiffuse(N, L, light.color, matDiffuse) * attenuation;
            vec3 specular = computeSpecular(N, L, V, light.color, matSpecular, matShininess) * attenuation;

            return diffuse + specular;
        }

        void main() {
            float depth = texture(gDepth, vTex).r;
            if (depth >= 1.0)
                discard;

            float matAmbient = texture(gMaterial, vTex).r;
            float matDiffuse = texture(gMaterial, vTex).g;
            float matSpecular = texture(gMaterial, vTex).b;
            float matShininess = texture(gMaterial, vTex).a;

            vec3 albedo = texture(gAlbedo, vTex).rgb;
            vec3 worldPos = texture(gPosition, vTex).xyz;
            vec3 N = texture(gNormal, vTex).xyz;
            vec3 V = normalize(uCameraPos - worldPos);

            vec3 lighting = vec3(0.0);

            for (int i = 0; i < uNumDirLights; i++)
                lighting += computeDirLight(uDirLights[i], N, V, matDiffuse, matSpecular, matShininess);

            for (int i = 0; i < uNumPointLights; i++)
                lighting += computePointLight(uPointLights[i], N, V, worldPos, matDiffuse, matSpecular, matShininess);
            
            vec3 ambient = matAmbient * albedo;

            outColor = vec4((ambient + lighting), 1.0);
        }
    `;
}

export class ToonShader {

    static MAX_DIR_LIGHTS   = 8;
    static MAX_POINT_LIGHTS = 256;

    /**
     * Pretty much the same as the phong shader expect the diffuse and specular components are quantized.
     */
    static fragSource =
    `   #version 300 es
        precision mediump float;

        #define MAX_DIR_LIGHTS   8
        #define MAX_POINT_LIGHTS 256

        in vec2 vTex;

        out vec4 outColor;

        struct DirLight {
            vec3 direction;
            vec3 color;
            float intensity;
        };

        struct PointLight {
            vec3 position;
            vec3 color;
            float intensity;
        };

        uniform sampler2D gPosition;
        uniform sampler2D gAlbedo;
        uniform sampler2D gNormal;
        uniform sampler2D gMaterial;
        uniform sampler2D gDepth;
        uniform sampler2D uPostColor;

        uniform vec3 uCameraPos;

        uniform DirLight uDirLights[MAX_DIR_LIGHTS];
        uniform PointLight uPointLights[MAX_POINT_LIGHTS];
        uniform int uNumDirLights;
        uniform int uNumPointLights;

        uniform float uSteps;

        float quantize(float value, float steps) {
            return floor(value * steps) / steps;
        }

        vec3 computeDiffuse(vec3 N, vec3 L, vec3 lightColor, float diff, float steps) {
            float diffuseIntensity = max(dot(N, L), 0.0);
            return diff * lightColor * quantize(diffuseIntensity, steps);
        }

        vec3 computeSpecular(vec3 N, vec3 L, vec3 V, vec3 lightColor, float specular, float shininess, float steps) {
            // if (dot(N, L) <= 0.0)
            //     return vec3(0.0, 0.0, 0.0);

            vec3 R = 2.0 * dot(L, N) * N - L;
            float specularIntensity = pow(max(dot(R, V), 0.0), shininess);
            return specular * lightColor * quantize(specularIntensity, steps);
        }

        vec3 computeDirLight(DirLight light, vec3 N, vec3 V, float matDiffuse, float matSpecular, float matShininess, float steps) {
            vec3 L = normalize(light.direction);
            vec3 diffuse = computeDiffuse(N, L, light.color, matDiffuse, steps);
            vec3 specular = computeSpecular(N, L, V, light.color, matSpecular, matShininess, steps);

            return (diffuse + specular) * light.intensity;
        }

        vec3 computePointLight(PointLight light, vec3 N, vec3 V, vec3 fragPos, float matDiffuse, float matSpecular, float matShininess, float steps) {
            float distance = length(light.position - fragPos);
            float attenuation = light.intensity / (distance * distance);

            vec3 L = normalize(light.position - fragPos);
            vec3 diffuse = computeDiffuse(N, L, light.color, matDiffuse, steps) * attenuation;
            vec3 specular = computeSpecular(N, L, V, light.color, matSpecular, matShininess, steps) * attenuation;

            return diffuse + specular;
        }

        void main() {
            float depth = texture(gDepth, vTex).r;
            if (depth >= 1.0)
                discard;

            float matAmbient = texture(gMaterial, vTex).r;
            float matDiffuse = texture(gMaterial, vTex).g;
            float matSpecular = texture(gMaterial, vTex).b;
            float matShininess = texture(gMaterial, vTex).a;

            vec3 albedo = texture(gAlbedo, vTex).rgb;
            vec3 worldPos = texture(gPosition, vTex).xyz;
            vec3 N = texture(gNormal, vTex).xyz;
            vec3 V = normalize(uCameraPos - worldPos);

            vec3 lighting = vec3(0.0);

            for (int i = 0; i < uNumDirLights; i++)
                lighting += computeDirLight(uDirLights[i], N, V, matDiffuse, matSpecular, matShininess, uSteps);

            for (int i = 0; i < uNumPointLights; i++)
                lighting += computePointLight(uPointLights[i], N, V, worldPos, matDiffuse, matSpecular, matShininess, uSteps);
            
            vec3 ambient = matAmbient * albedo;

            outColor = vec4((ambient + lighting), 1.0);
        }
    `;
}
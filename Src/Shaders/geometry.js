export class GBufferShader {
    
    static vertSource =
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

        uniform mat4 uModel;
        uniform mat4 uView;
        uniform mat4 uProjection;

        void main() {
            vec4 worldPos = uModel * vec4(inPos, 1.0);
            gl_Position = uProjection * uView * worldPos;

            vWorldPos = worldPos.xyz;
            vColor = inColor;
            vTex = inTex;

            vNormal = normalize(mat3(uModel) * inNormal);
        }
    `;

    static fragSource =
    `   #version 300 es
        precision mediump float;

        in vec3 vWorldPos;
        in vec4 vColor;
        in vec2 vTex;
        in vec3 vNormal;

        layout (location = 0) out vec3 gPosition;
        layout (location = 1) out vec3 gAlbedo;
        layout (location = 2) out vec3 gNormal;

        uniform sampler2D tex0;

        void main() {
            gPosition = vWorldPos;
            gAlbedo = texture(tex0, vTex).rgb;
            gNormal = normalize(vNormal);
        }
    `;
}
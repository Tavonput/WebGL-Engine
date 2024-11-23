export class LightBoxShader {

    static vertSource = 
    `   #version 300 es
        precision mediump float;

        in vec3 inPos;
        in vec4 inColor;
        in vec2 inTex;
        in vec3 inNormal;

        uniform mat4 uModel;
        uniform mat4 uView;
        uniform mat4 uProjection;

        void main() {
            gl_Position = uProjection * uView * uModel * vec4(inPos, 1.0);
        }
    `;

    static fragSource =
    `   #version 300 es
        precision mediump float;

        out vec4 outColor;

        uniform vec3 uLightColor;

        void main() {
            outColor = vec4(uLightColor, 1.0);
        }
    `;
}
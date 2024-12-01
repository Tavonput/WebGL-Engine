export class SkyboxShaders {
    
    static vertSource =
    `   #version 300 es
        precision mediump float;

        in vec3 inPos;
        in vec4 inColor;
        in vec2 inTex;
        in vec3 inNormal;

        out vec3 vTex;

        uniform mat4 uView;
        uniform mat4 uProjection;

        void main() {
            vTex = inPos;
            vec4 pos = uProjection * uView * vec4(inPos,1.0);
            gl_Position = pos.xyww ;

        }
    `;

    static fragSource =
    `   #version 300 es
        precision mediump float;

        in vec3 vTex;
        
        out vec4 outColor;

        uniform samplerCube skybox;
        
        void main() {
            outColor = texture(skybox, vTex);
        }
    `;
}
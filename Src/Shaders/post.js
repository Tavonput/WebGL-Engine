export class PostShader {
    /**
     * Draws a full screen quad with a single triangle. To see how this works, draw it out on a piece of paper. Note that this
     * shader will run 3 times, once for each value of gl_VertexID = [0, 1, 2].
     */
    static vertSource =
    `   #version 300 es
        precision mediump float;
    
        out vec2 vTex;
    
        void main() {
            vec2 base = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
            gl_Position = vec4(base * 2.0 - 1.0, 1.0, 1.0);
    
            vTex = base;
        }
    `;
    
    /**
     * Just outputs to the screen.
     */
    static fragSource =
    `   #version 300 es
        precision mediump float;
    
        in vec2 vTex;
    
        out vec4 outColor;
    
        uniform sampler2D uPostColor;
    
        void main() {
            outColor = vec4(texture(uPostColor, vTex).rgb, 1.0);
        }
    `;
}

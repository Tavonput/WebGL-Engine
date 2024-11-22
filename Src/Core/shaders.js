export class ShaderProgram {
    /**
     * Constructor.
     * 
     * @param {WebGL2RenderingContext} gl 
     * @param {string} vertexSource 
     * @param {string} fragmentSource 
     */
    constructor(gl, vertexSource, fragmentSource) {
        let vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, vertexSource);
        gl.compileShader(vertexShader);

        let fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, fragmentSource);
        gl.compileShader(fragmentShader);

        this.program = gl.createProgram();
        gl.attachShader(this.program, vertexShader);
        gl.attachShader(this.program, fragmentShader);
        gl.linkProgram(this.program);

        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);

        this.enabled = true;
    }

    /**
     * Bind the shader.
     * 
     * @param {WebGL2RenderingContext} gl 
     */
    bind(gl) {
        gl.useProgram(this.program);
    }

    /**
     * Set a mat4f.
     * 
     * @param {WebGL2RenderingContext} gl 
     * @param {string}                 name 
     * @param {number[]}               data 
     */
    setUniformMat4f(gl, name, data) {
        const loc = gl.getUniformLocation(this.program, name);
        gl.uniformMatrix4fv(loc, true, data);
    }

    /**
     * Set a vec2f.
     * 
     * @param {WebGL2RenderingContext} gl 
     * @param {string}                 name 
     * @param {number}                 x
     * @param {number}                 y
     */
    setUniformVec2f(gl, name, x, y) {
        const loc = gl.getUniformLocation(this.program, name);
        gl.uniform2f(loc, x, y);
    }

    /**
     * Set a vec3f.
     * 
     * @param {WebGL2RenderingContext} gl 
     * @param {string}                 name 
     * @param {number}                 x
     * @param {number}                 y
     * @param {number}                 z 
     */
    setUniformVec3f(gl, name, x, y, z) {
        const loc = gl.getUniformLocation(this.program, name);
        gl.uniform3f(loc, x, y, z);
    }

    /**
     * Set a vec4f.
     * 
     * @param {WebGL2RenderingContext} gl 
     * @param {string}                 name 
     * @param {number}                 x
     * @param {number}                 y
     * @param {number}                 z 
     * @param {number}                 w
     */
    setUniformVec4f(gl, name, x, y, z, w) {
        const loc = gl.getUniformLocation(this.program, name);
        gl.uniform4f(loc, x, y, z, w);
    }

    /**
     * Set an int.
     * 
     * @param {WebGL2RenderingContext} gl 
     * @param {string}                 name 
     * @param {number}                 data 
     */
    setUniformInt(gl, name, data) {
        const loc = gl.getUniformLocation(this.program, name);
        gl.uniform1i(loc, data);
    }

    /**
     * Set a float.
     * 
     * @param {WebGL2RenderingContext} gl 
     * @param {string}                 name 
     * @param {number}                 data 
     */
    setUniformFloat(gl, name, data) {
        const loc = gl.getUniformLocation(this.program, name);
        gl.uniform1f(loc, data);
    }

    /**
     * Cleanup the OpenGL shader program.
     * 
     * @param {WebGL2RenderingContext} gl 
     */
    cleanup(gl) {
        gl.deleteProgram(this.program);
    }
}
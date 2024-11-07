class VertexAttributeBinding {
    /**
     * Constructor.
     * 
     * @param {number} type 
     * @param {number} numComponents 
     * @param {number} stride 
     * @param {number} offset 
     */
    constructor(type, numComponents, stride, offset)
    {
        this.type          = type;
        this.numComponents = numComponents;
        this.offset        = offset;
        this.stride        = stride;
    }
}

// ========================================================================================================================
// Buffer
// 
// The base Buffer class. Includes common functionality for all OpenGl buffers.
export class Buffer {
    /**
     * Create a buffer.
     * 
     * @param {number}                 count 
     * @param {number}                 stride
     */
    constructor(count, stride) {
        this.count = count;
        this.stride = stride ?? 0;

        this.glBuffer = null;
    }

    /**
     * Bind the buffer.
     * 
     * @param {WebGL2RenderingContext} gl 
     * @param {number}                 glBufferType
     */
    bind(gl, glBufferType) {
        gl.bindBuffer(glBufferType, this.glBuffer);
    }

    /**
     * Cleanup the buffer.
     * 
     * @param {WebGL2RenderingContext} gl
     */
    cleanup(gl) {
        gl.deleteBuffer(this.glBuffer);
    }

    /**
     * Set the OpenGL buffer with data.
     * 
     * @param {WebGL2RenderingContext}                  gl 
     * @param {number[]}                                data
     * @param {typeof Float32Array | typeof Int32Array} dataType
     * @param {number}                                  glBufferType
     */
    setGLBuffer(gl, data, dataType, glBufferType) {
        this.glBuffer = gl.createBuffer();
        gl.bindBuffer(glBufferType, this.glBuffer);
        gl.bufferData(glBufferType, new dataType(data), gl.STATIC_DRAW);
    }
}

// ========================================================================================================================
// Vertex Buffer
//
// Contains functionality for vertex buffers.
export class VertexBuffer {
    /**
     * Create a vertex buffer.
     * 
     * @param {WebGL2RenderingContext} gl 
     * @param {number[]}               data
     * @param {number}                 count 
     * @param {number}                 stride
     */
    constructor(gl, data, count, stride) {
        this.buffer = new Buffer(count, stride);
        this.buffer.setGLBuffer(gl, data, Float32Array, gl.ARRAY_BUFFER);
    }

    /**
     * Get the vertex attribute information.
     * 
     * @param {WebGL2RenderingContext} gl 
     * 
     * @returns {VertexAttributeBinding[]}
     */
    getAttributes(gl) {
        return [
            new VertexAttributeBinding(gl.FLOAT, 3, this.buffer.stride, 0),  // Position
            new VertexAttributeBinding(gl.FLOAT, 4, this.buffer.stride, 12), // Color
            new VertexAttributeBinding(gl.FLOAT, 2, this.buffer.stride, 28), // UV
            new VertexAttributeBinding(gl.FLOAT, 3, this.buffer.stride, 36), // Normal
        ];
    }

    /**
     * Bind the vertex buffer.
     * 
     * @param {WebGL2RenderingContext} gl 
     */
    bind(gl) {
        this.buffer.bind(gl, gl.ARRAY_BUFFER);
    }

    /**
     * Draw the vertex buffer.
     * 
     * @param {WebGL2RenderingContext} gl
     */
    draw(gl) {
        gl.drawArrays(gl.TRIANGLES, 0, this.buffer.count);
    }
}

// ========================================================================================================================
// Index Buffer
//
// Contains the functionality for index buffers.
export class IndexBuffer {
    /**
     * Create an index buffer.
     * 
     * @param {WebGL2RenderingContext} gl 
     * @param {number[]}               data
     * @param {number}                 count 
     */
    constructor(gl, data, count) {
        this.buffer = new Buffer(count, 0);
        this.buffer.setGLBuffer(gl, data, Int32Array, gl.ELEMENT_ARRAY_BUFFER);

        this.topology = gl.TRIANGLES;
    }

    /**
     * Change the OpenGL topology of the buffer.
     * 
     * @param {number} topology 
     */
    changeTopology(topology) {
        this.topology = topology;
    }

    /**
     * Bind the index buffer.
     * 
     * @param {WebGL2RenderingContext} gl 
     */
    bind(gl) {
        this.buffer.bind(gl, gl.ELEMENT_ARRAY_BUFFER);
    }

    /**
     * Draw an index buffer.
     * 
     * @param {WebGL2RenderingContext} gl 
     */
    draw(gl) {
        gl.drawElements(this.topology, this.buffer.count, gl.UNSIGNED_INT, 0);
    }
}
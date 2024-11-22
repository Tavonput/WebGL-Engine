import { VertexBuffer, IndexBuffer } from "./buffer.js";
import { ShaderProgram } from "./shaders.js";
import { Mat4 } from "../Math/matrix.js";

const VERTEX_STRIDE = 48;

// ========================================================================================================================
// Mesh Config
//
// A structure that hold configuration settings for a mesh such as winding order.
class MeshConfig {

    constructor() {
        this.windingCCW = true;
    }

    /**
     * Set the global gl rendering settings.
     * 
     * @param {WebGL2RenderingContext} gl 
     */
    setConfigurations(gl) {
        if (this.windingCCW)
            gl.frontFace(gl.CCW);
        else
            gl.frontFace(gl.CW);
    }
};

// ========================================================================================================================
// Mesh Instance
//
// A mesh instance is an object that has a unique model matrix and references a mesh. Drawing a mesh instance updates its
// model matrix and renders according to its mesh.
export class MeshInstance {
    /**
     * Create an instance of a mesh.
     * 
     * @param {Mesh} mesh 
     */
    constructor(mesh) {
        this.mesh  = mesh;
        this.model = Mat4.identity();

        this.scale       = Mat4.identity();
        this.translation = Mat4.identity();
        this.rotation    = Mat4.identity();
    }

    /**
     * Draw the instance with a given shader program.
     * 
     * @param {WebGL2RenderingContext} gl 
     * @param {ShaderProgram}          program 
     * @param {boolean}                updateModel
     */
    draw(gl, program, updateModel = true) {
        if (updateModel)
            this.updateModel();

        program.bind(gl);
        program.setUniformMat4f(gl, "uModel", this.model.data);
        
        this.mesh.draw(gl, program);
    }

    /**
     * Update the model matrix.
     */
    updateModel() {
        this.model = this.translation.mul(this.rotation.mul(this.scale));
    }
}

// ========================================================================================================================
// Mesh
//
// A mesh holds the vertex data and indices. Meshes loaded from files are loaded asynchronously with callbacks.
//
// TODO:
// - Not all meshes will the same configurations (such as winding order), so make a mesh config or something.
// - On parsing, make a method that will interleave the attributes (necessary when we want normals and stuff). 
export class Mesh {
    /**
     * Create a mesh.
     * 
     * @param {WebGLRenderingContext} gl 
     * @param {number[]}              vertices 
     * @param {number[]}              indices 
     * @param {boolean}               isReady
     */
    constructor(gl, vertices, indices, isReady = false) {
        this.isReady = isReady;

        if (isReady) {
            this.vertexBuffer = new VertexBuffer(gl, vertices, vertices.length, VERTEX_STRIDE);
            this.indexBuffer  = new IndexBuffer(gl, indices, indices.length);
        }

        this.config = new MeshConfig();
    }

    /**
     * Create an instance of this mesh.
     * 
     * @returns {MeshInstance}
     */
    createInstance() {
        return new MeshInstance(this);
    }

    /**
     * To be called when when the mesh is done loading. Copies over the buffers and stuff.
     * 
     * @param {Mesh} loadedMesh 
     */
    onLoad(loadedMesh) {
        this.isReady = true;

        this.vertexBuffer = loadedMesh.vertexBuffer;
        this.indexBuffer  = loadedMesh.indexBuffer;
    }

    /**
     * Draw the mesh.
     * 
     * @param {WebGLRenderingContext} gl 
     */
    draw(gl, program) {
        if (!this.isReady)
            return;

        this.config.setConfigurations(gl);

        program.bind(gl);
        this.vertexBuffer.bind(gl);
        this.indexBuffer.bind(gl);

        this._setVertexAttributes(gl);

        this.indexBuffer.draw(gl, this.indexBuffer);
    }

    /**
     * Create a cube mesh with the given dimensions.
     * 
     * @param {WebGL2RenderingContext} gl 
     * @param {number}                 width 
     * @param {number}                 height 
     * @param {number}                 depth 
     * 
     * @returns {Mesh}
     */
    static cube(gl, width, height, depth) {
        let w = width / 2.0;
        let h = height / 2.0;
        let d = depth / 2.0;

        let vertices = [
            // Pos        Color                 Tex          Normal

            // Front
            -w,  h, -d,   0.5, 0.5, 0.5, 1.0,   0.0, 0.0,    0.0,  0.0, -1.0,
             w,  h, -d,   0.5, 0.5, 0.5, 1.0,   1.0, 0.0,    0.0,  0.0, -1.0,
             w, -h, -d,   0.5, 0.5, 0.5, 1.0,   1.0, 1.0,    0.0,  0.0, -1.0,
            -w, -h, -d,   0.5, 0.5, 0.5, 1.0,   0.0, 1.0,    0.0,  0.0, -1.0,

            // Back
             w,  h,  d,   0.5, 0.5, 0.5, 1.0,   0.0, 0.0,    0.0,  0.0,  1.0,
            -w,  h,  d,   0.5, 0.5, 0.5, 1.0,   1.0, 0.0,    0.0,  0.0,  1.0, 
            -w, -h,  d,   0.5, 0.5, 0.5, 1.0,   1.0, 1.0,    0.0,  0.0,  1.0,
             w, -h,  d,   0.5, 0.5, 0.5, 1.0,   0.0, 1.0,    0.0,  0.0,  1.0,

            // Right
             w,  h, -d,   0.5, 0.5, 0.5, 1.0,   0.0, 0.0,    1.0,  0.0,  0.0,
             w,  h,  d,   0.5, 0.5, 0.5, 1.0,   1.0, 0.0,    1.0,  0.0,  0.0,
             w, -h,  d,   0.5, 0.5, 0.5, 1.0,   1.0, 1.0,    1.0,  0.0,  0.0,
             w, -h, -d,   0.5, 0.5, 0.5, 1.0,   0.0, 1.0,    1.0,  0.0,  0.0,

            // Left
            -w,  h,  d,   0.5, 0.5, 0.5, 1.0,   0.0, 0.0,   -1.0,  0.0,  0.0,
            -w,  h, -d,   0.5, 0.5, 0.5, 1.0,   1.0, 0.0,   -1.0,  0.0,  0.0,
            -w, -h, -d,   0.5, 0.5, 0.5, 1.0,   1.0, 1.0,   -1.0,  0.0,  0.0,
            -w, -h,  d,   0.5, 0.5, 0.5, 1.0,   0.0, 1.0,   -1.0,  0.0,  0.0,

            // Top
            -w,  h,  d,   0.5, 0.5, 0.5, 1.0,   1.0, 1.0,    0.0,  1.0,  0.0,
             w,  h,  d,   0.5, 0.5, 0.5, 1.0,   0.0, 1.0,    0.0,  1.0,  0.0,
             w,  h, -d,   0.5, 0.5, 0.5, 1.0,   0.0, 0.0,    0.0,  1.0,  0.0,
            -w,  h, -d,   0.5, 0.5, 0.5, 1.0,   1.0, 0.0,    0.0,  1.0,  0.0,

            // Bottom
            -w, -h, -d,   0.5, 0.5, 0.5, 1.0,   1.0, 1.0,    0.0, -1.0,  0.0,
             w, -h, -d,   0.5, 0.5, 0.5, 1.0,   0.0, 1.0,    0.0, -1.0,  0.0,
             w, -h,  d,   0.5, 0.5, 0.5, 1.0,   0.0, 0.0,    0.0, -1.0,  0.0,
            -w, -h,  d,   0.5, 0.5, 0.5, 1.0,   1.0, 0.0,    0.0, -1.0,  0.0,
        ];

        let indices = [
            2,   1,  0,  0,  3,  2,
            6,   5,  4,  4,  7,  6,
            10,  9,  8,  8, 11, 10,
            14, 13, 12, 12, 15, 14,
            18, 17, 16, 16, 19, 18,
            22, 21, 20, 20, 23, 22,
        ];

        return new Mesh(gl, vertices, indices, true);
    }

    /**
     * Create a cube mesh with the given dimensions.
     * 
     * @param {WebGL2RenderingContext} gl 
     * @param {number}                 width 
     * @param {number}                 height 
     * @param {number}                 depth 
     * 
     * @returns {Mesh}
     */
    static cubeAtlas(gl, width, height, depth) {
        let w = width / 2.0;
        let h = height / 2.0;
        let d = depth / 2.0;

        let vertices = [
            // Pos        Color                 Tex

            // Front
            -w, h, -d, 0.5, 0.5, 0.5, 1.0,  0.00, 0.25,
            w, h, -d, 0.5, 0.5, 0.5, 1.0,   0.25, 0.25,
            w, -h, -d, 0.5, 0.5, 0.5, 1.0,  0.25, 0.50,
            -w, -h, -d, 0.5, 0.5, 0.5, 1.0, 0.00, 0.50,

            // Back
            w, h, d, 0.5, 0.5, 0.5, 1.0,    0.50, 0.25,
            -w, h, d, 0.5, 0.5, 0.5, 1.0,   0.75, 0.25,
            -w, -h, d, 0.5, 0.5, 0.5, 1.0,  0.75, 0.50,
            w, -h, d, 0.5, 0.5, 0.5, 1.0,   0.50, 0.50,

            // Right
            w, h, -d, 0.5, 0.5, 0.5, 1.0,  0.25, 0.25,
            w, h, d, 0.5, 0.5, 0.5, 1.0,   0.50, 0.25,
            w, -h, d, 0.5, 0.5, 0.5, 1.0,  0.50, 0.50,
            w, -h, -d, 0.5, 0.5, 0.5, 1.0, 0.25, 0.50,

            // Left
            -w, h, d, 0.5, 0.5, 0.5, 1.0,   1.00, 0.25,
            -w, h, -d, 0.5, 0.5, 0.5, 1.0,  0.75, 0.25,
            -w, -h, -d, 0.5, 0.5, 0.5, 1.0, 0.75, 0.50,
            -w, -h, d, 0.5, 0.5, 0.5, 1.0,  1.00, 0.50,

            // Top
            -w, h, d, 0.5, 0.5, 0.5, 1.0,  0.75, 0.00,
            w, h, d, 0.5, 0.5, 0.5, 1.0,   0.50, 0.00,
            w, h, -d, 0.5, 0.5, 0.5, 1.0,  0.50, 0.25,
            -w, h, -d, 0.5, 0.5, 0.5, 1.0, 0.75, 0.25,

            // Bottom
            -w, -h, -d, 0.5, 0.5, 0.5, 1.0, 0.75, 0.75,
            w, -h, -d, 0.5, 0.5, 0.5, 1.0,  0.50, 0.75,
            w, -h, d, 0.5, 0.5, 0.5, 1.0,   0.50, 0.50,
            -w, -h, d, 0.5, 0.5, 0.5, 1.0,  0.75, 0.50,
        ];

        let indices = [
            2, 1, 0, 0, 3, 2,
            6, 5, 4, 4, 7, 6,
            10, 9, 8, 8, 11, 10,
            14, 13, 12, 12, 15, 14,
            18, 17, 16, 16, 19, 18,
            22, 21, 20, 20, 23, 22,
        ];

        return new Mesh(gl, vertices, indices, true);
    }

    /**
     * Create a sphere mesh with the given sub divisions.
     * 
     * @param {WebGL2RenderingContext} gl 
     * @param {number}                 subdivs
     * 
     * @returns {Mesh}
     */
    static sphere(gl, subdivs) {
        const layers = subdivs;
        const TAU = 2 * Math.PI;

        let vertices = [];
        let indices = [];

        for (let layer = 0; layer <= layers; layer++)
        {
            const currentLayerIdx = layer * (subdivs + 1);
            const nextLayerIdx = (layer + 1) * (subdivs + 1);

            const yTurns = layer / subdivs / 2;
            const rs = Math.sin(TAU * yTurns);
            const y = Math.cos(yTurns * TAU) / 2;

            for (let subdiv = 0; subdiv <= subdivs; subdiv++)
            {
                const turns = subdiv / subdivs;
                const rads = turns * TAU;

                const x = Math.cos(rads) / 2 * rs;
                const z = Math.sin(rads) / 2 * rs;

                const u = turns;
                const v = layer / subdivs;

                const magnitude = Math.sqrt(x * x + y * y + z * z);
                const nx = x / magnitude;
                const ny = y / magnitude;
                const nz = z / magnitude;

                vertices.push(
                    x, y, z,
                    0.5, 0.5, 0.5, 1.0,
                    u, v,
                    nx, ny, nz,
                );

                indices.push(currentLayerIdx + subdiv);
                indices.push(nextLayerIdx + subdiv);
            }
        }

        let mesh = new Mesh(gl, vertices, indices, true);
        mesh.indexBuffer.changeTopology(gl.TRIANGLE_STRIP);
        
        return mesh;
    }

    /**
     * Asynchronously load the obj file as a mesh.
     * 
     * @param {WebGLRenderingContext} gl
     * @param {string}                filename
     * @param {function}              f the function to call and give mesh to when finished.
     */
    static fromObjFile(gl, file_name, f) {
        let request = new XMLHttpRequest();

        // the function that will be called when the file is being loaded
        request.onreadystatechange = function () {
            // console.log( request.readyState );

            if (request.readyState != 4) { return; }
            if (request.status != 200) {
                throw new Error('HTTP error when opening .obj file: ', request.statusText);
            }

            // now we know the file exists and is ready
            let loaded_mesh = Mesh._parseTxt(gl, request.responseText);

            console.log('loaded ', file_name);
            f(loaded_mesh);
        };

        request.open('GET', file_name); // initialize request. 
        request.send();                 // execute request
    }

    /**
     * Parse the given text as the body of an obj file.
     * 
     * @param {WebGLRenderingContext} gl
     * @param {string}                text
     * 
     * @returns {Mesh}
     */
    static _parseTxt(gl, text) {
        const vertices = [];
        const indices  = [];

        // Iterate over each line
        text.split(/\r?\n/).forEach(line =>
        {
            let tokens = line.trim().split(/(\s+)/);

            if (tokens[0] === "v")
            {
                vertices.push(tokens[2], tokens[4], tokens[6]);

                // Default color
                vertices.push(0.5, 0.5, 0.5, 1.0);
            }
            else if (tokens[0] === "f")
                indices.push(tokens[2] - 1, tokens[4] - 1, tokens[6] - 1);
        });

        return new Mesh(gl, vertices, indices, true);
    }

    /**
     * Set the attributes for the vertex buffer of this mesh.
     * 
     * @param {WebGL2RenderingContext} gl
     */
    _setVertexAttributes(gl) {
        let prevBuffer = gl.getParameter(gl.ARRAY_BUFFER_BINDING);
        this.vertexBuffer.bind(gl);

        const attributes = this.vertexBuffer.getAttributes(gl);
        attributes.forEach((attribute, loc) =>
        {
            gl.enableVertexAttribArray(loc);
            gl.vertexAttribPointer(
                loc, attribute.numComponents, attribute.type, false, attribute.stride, attribute.offset
            );
        });

        gl.bindBuffer(gl.ARRAY_BUFFER, prevBuffer);
    }
}

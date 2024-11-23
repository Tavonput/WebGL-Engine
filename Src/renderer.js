import { Camera } from "./camera.js";
import { Keys } from "./Core/event.js";
import { ShaderProgram } from "./Core/shaders.js"; 
import { FrameBuffer } from "./Core/framebuffer.js";

import { PostShader } from "./Shaders/post.js";

// ========================================================================================================================
// Renderer
//
// A renderer manages the rendering context. A renderer is provided with three callbacks, onInit, onRender, and onUpdate.
// Each callback is passed a reference to the renderer instance. The renderer will class onInit once before the rendering
// starts, onRender every render update, and onUpdate ever "game" update.
//
// The renderer provides functionality for the post-processing pass. It uses a ping-pong buffer approach.
export class Renderer {
    /**
     * Create a renderer with callback functions.
     * 
     * @param {WebGL2RenderingContext} gl 
     * @param {number}                 width
     * @param {number}                 height
     */
    constructor(gl, width, height) {
        this.gl = gl;

        this.width = width;
        this.height = height;

        this.onInit = null;
        this.onRender = null;
        this.onUpdate = null;

        this.camera = new Camera(width / height);
        this.camera.position = [0.0, 0.0, -1.0];

        this.updatesPerSecond = 60;

        this.startTime = performance.now() / 1000;
        this.deltaTimeRender = this.startTime;

        this.previousTimeUpdate = this.startTime;
        this.deltaTimeUpdate = this.startTime;
        
        // Post processing fields
        // ----------------------

        /** @type {ShaderProgram[]} */
        this.postShaders = [];
    
        this.pingBuffer = new FrameBuffer(gl, width, height);
        this.pingBufferColorTarget = this.pingBuffer.addColorAttachment(FrameBuffer.COLOR_TYPE_INT);

        this.pongBuffer = new FrameBuffer(gl, width, height);
        this.pongBufferColorTarget = this.pongBuffer.addColorAttachment(FrameBuffer.COLOR_TYPE_INT);

        this.readBuffer = this.pingBuffer;
        this.writeBuffer = this.pongBuffer;

        this.finalShader = new ShaderProgram(gl, PostShader.vertSource, PostShader.fragSource);
    }

    /**
     * Run the renderer.
     */
    run() {
        if (!this.onInit || !this.onRender || !this.onUpdate) {
            console.log("Renderer is missing on of the callback functions");
            return;
        }

        // Init
        this.onInit(this);

        // Update
        const update = () => {
            const currentTime = performance.now() / 1000;
            this.deltaTimeUpdate    = currentTime - this.previousTimeUpdate;
            this.previousTimeUpdate = currentTime;

            this.onUpdate(this);
        }
        setInterval(update, 1000.0 / this.updatesPerSecond, this);

        // Render
        const render = (now) => {
            this.deltaTimeRender = (now / 1000) - this.startTime;
            requestAnimationFrame(render);
            this._beginFrame();
    
            this.onRender(this);
        }
        requestAnimationFrame(render);
    }

    /**
     * Update the camera given the current state of the keyboard.
     * 
     * @param {Keys} keyboard 
     */
    updateCamera(keyboard) {
        let dx = 0, dy = 0, dz  = 0;
        let dr = 0, dp = 0, dyw = 0;

        keyboard.getAllKeysDown().forEach((code) => {
            switch (code) {
                // Orientation
                case "ArrowUp":
                    dp += this.deltaTimeUpdate;
                    break;
                case "ArrowDown":
                    dp -= this.deltaTimeUpdate;
                    break;
                case "ArrowLeft":
                    dyw -= this.deltaTimeUpdate;
                    break;
                case "ArrowRight":
                    dyw += this.deltaTimeUpdate;
                    break;
                case "KeyQ":
                    dr -= this.deltaTimeUpdate;
                    break;
                case "KeyE":
                    dr += this.deltaTimeUpdate;
                    break;
                
                // Position
                case "KeyW":
                    dz += this.deltaTimeUpdate;
                    break;
                case "KeyA":
                    dx -= this.deltaTimeUpdate;
                    break;
                case "KeyS":
                    dz -= this.deltaTimeUpdate;
                    break;
                case "KeyD":
                    dx += this.deltaTimeUpdate;
                    break;
                case "Space":
                    dy += this.deltaTimeUpdate;
                    break;
                case "KeyC":
                    dy -= this.deltaTimeUpdate;
                    break;
            }
        })

        this.camera.updatePosition(dx, dy, dz);
        this.camera.updateOrientation(dr, dp, dyw);
    }

    bindScreenFramebuffer() {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    }

    drawFullScreenQuad() {
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 3);
    }

    setClearColor(r, g, b, a) {
        this.gl.clearColor(r, g, b, a);
    }

    clearRenderTargets() {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    }

    enableDepthTesting() {
        this.gl.enable(this.gl.DEPTH_TEST);
    }

    disableDepthTesting() {
        this.gl.disable(this.gl.DEPTH_TEST);
    }

    /**
     * Add a shader to the post processing pipeline.
     * 
     * @param {ShaderProgram} shader 
     */
    addPostProcessingShader(shader) {
        this.postShaders.push(shader);
    }

    /**
     * Render the post processing shaders in order using a ping-pong approach.
     *
     * @param {FrameBuffer} startBuffer The buffer to copy the color attachment from. 
     * @param {number} attachmentCopyId The color attachment id of the target to be copied.
     * @param {number} postColorSlot The active texture slot for the post processing color texture.
     */
    renderPostProcessingPipeline(startBuffer, attachmentCopyId, postColorSlot) {
        const gl = this.gl;

        this.disableDepthTesting();

        // this._clearPingPongBuffers();
        // Technically we don't have to clear the ping-pong buffers here since the subsequent copy commands
        // will override whatever is currently in the buffers.

        FrameBuffer.copyColor(gl, startBuffer, this.pingBuffer, attachmentCopyId);
        FrameBuffer.copyColor(gl, startBuffer, this.pongBuffer, attachmentCopyId);
        
        for (const shader of this.postShaders) {
            if (!shader.enabled) continue;

            this.writeBuffer.bind();
            shader.bind(gl);

            // Bind the correct ping-pong buffer for this iteration
            this.readBuffer === this.pingBuffer ?
                this.pingBufferColorTarget.bind(gl, postColorSlot) :
                this.pongBufferColorTarget.bind(gl, postColorSlot);
            
            this.drawFullScreenQuad();

            [this.readBuffer, this.writeBuffer] = [this.writeBuffer, this.readBuffer];
        }
    }

    /**
     * Rendering the final post processing output to the screen.
     */
    finalizePostProcessing() {
        const gl = this.gl;

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        this.clearRenderTargets();
        this.finalShader.bind(gl);

        // Bind the correct ping-pong buffer
        this.readBuffer === this.pingBuffer ?
            this.pingBufferColorTarget.bind(gl, 0) :
            this.pongBufferColorTarget.bind(gl, 0);
        
        this.drawFullScreenQuad();
    }

    /**
     * Clear the ping-pong color and depth buffers.
     */
    _clearPingPongBuffers() {
        this.pingBuffer.bind();
        this.clearRenderTargets();

        this.pongBuffer.bind();
        this.clearRenderTargets();

        this.pongBuffer.unbind();
    }

    /**
     * Initialize the rendering parameters and clear the buffers.
     */
    _beginFrame() {
        const gl = this.gl;

        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);

        gl.cullFace(gl.BACK);

        gl.clearColor(0.2, 0.2, 0.2, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }

    _checkGLError() {
        const error = this.gl.getError();
        if (error != 0)
            throw new Error("OpenGL error: " + error);
    }
}
import { Camera } from "./camera.js";
import { Keys } from "./Core/event.js";
import { ShaderProgram } from "./Core/shaders.js"; 
import { FrameBuffer } from "./Core/framebuffer.js";

import { GBufferShader } from "./Shaders/geometry.js";
import { PostShader } from "./Shaders/post.js";

// ========================================================================================================================
// Renderer
//
// A renderer manages the rendering context. A renderer is provided with three callbacks, onInit, onRender, and onUpdate.
// Each callback is passed a reference to the renderer instance. The renderer will call onInit once before the rendering
// starts, onRender every render update, and onUpdate ever "game" update.
//
// The renderer is broken up into three main render passes: Geometry Pass -> Post Processing Pass -> Final Forward Pass.
// Geometry Pass:
//     As described in traditional deferred shading, the geometry pass renders all of the geometry in the scene and stores
//     the final visible pixel information in the G buffer. Our G buffer contains 5 targets defined in this order:
//     - World Position
//     - Albedo
//     - Normal
//     - Material (ambient, diffuse, specular, shininess)
//     - Depth
//     thus every shader using the G buffer output (the post processing shaders) must match the G buffer format.
// Post Processing Pass:
//     The post processing is done sequentially with a ping-pong approach, thus the order in which the user adds their
//     post processing shaders to the renderer will be the rendering order. All post processing shaders defined by the
//     user must have the exact G buffer format for the first uniform sampler2D slots. The next uniform sampler2D (the one
//     right after the G buffer uniforms) must be defined for the color output of the previous post processing shader.
// Final Forward Pass:
//     This pass is used for any addition rendering that needs to be done after post processing. It will start will the
//     depth buffer from the geometry pass.
//
// Note on the final forward pass. Usually we would just copy the G buffer depth attachment to the default framebuffer's
// depth attachment, then continue with rendering. This approach is descried in the LearnOpenGL Deferred Shading chapter.
// But, unfortunately WebGL does not seem to allow us to manually copy data into the default depth attachment, thus we
// have to work around this. Instead, we will setup an intermediate framebuffer where we can copy the G buffer depth
// attachment to. We will also copy the result of the post processing color attachment to the intermediate framebuffer's
// main color attachment. Then we can render to the intermediate framebuffer and write the final result in one last pass to
// the screen.
export class Renderer {
    /**
     * Create a renderer.
     * 
     * @param {WebGL2RenderingContext} gl 
     * @param {number}                 width
     * @param {number}                 height
     */
    constructor(gl, width, height) {
        this.gl = gl;

        // General rendering fields
        // ------------------------
        this.width = width;
        this.height = height;

        // To be set by the user
        this.onInit = null;
        this.onRender = null;
        this.onUpdate = null;

        this.updatesPerSecond = 60;

        this.startTime = performance.now() / 1000;
        this.deltaTimeRender = this.startTime;

        this.previousTimeUpdate = this.startTime;
        this.deltaTimeUpdate = this.startTime;
        
        // G buffer fields
        // ---------------
        this.gBufferShader = new ShaderProgram(gl, GBufferShader.vertSource, GBufferShader.fragSource);

        this.gBuffer = new FrameBuffer(gl, width, height);
        this.gBufferDepthTarget = this.gBuffer.addDepthAttachment();
        this.gBufferPosTarget = this.gBuffer.addColorAttachment(FrameBuffer.COLOR_TYPE_FLOAT);
        this.gBufferAlbedoTarget = this.gBuffer.addColorAttachment(FrameBuffer.COLOR_TYPE_INT);
        this.gBufferNormalTarget = this.gBuffer.addColorAttachment(FrameBuffer.COLOR_TYPE_FLOAT);
        this.gBufferMaterialTarget = this.gBuffer.addColorAttachment(FrameBuffer.COLOR_TYPE_FLOAT);

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

        // Final forward pass fields
        // -------------------------
        this.forwardBuffer = new FrameBuffer(gl, width, height);
        this.forwardDepthTarget = this.forwardBuffer.addDepthAttachment();
        this.forwardColorTarget = this.forwardBuffer.addColorAttachment(FrameBuffer.COLOR_TYPE_INT);

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
        this.initializePostProcessingShaders();
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
     * Run the geometry pass.
     * 
     * @param {function} renderPass 
     */
    geometryPass(renderPass) {
        this.gBuffer.bind();
        this.gBufferShader.bind(this.gl);

        this.clearRenderTargets();
        this.enableDepthTesting();

        renderPass();

        this.gBuffer.unbind();
    }

    /**
     * Run the post processing pass.
     * 
     * @param {function} renderPass 
     */
    postProcessingPass(renderPass) {
        const gl = this.gl;

        // Bind the G buffer targets
        this.gBufferPosTarget.bind(gl, 0);
        this.gBufferAlbedoTarget.bind(gl, 1);
        this.gBufferNormalTarget.bind(gl, 2);
        this.gBufferMaterialTarget.bind(gl, 3)
        this.gBufferDepthTarget.bind(gl, 4);

        renderPass();
    }

    /**
     * Run the final forward pass.
     * 
     * @param {function} renderPass 
     */
    finalForwardPass(renderPass) {
        const gl = this.gl;

        // Retrieve the post processing color target and the G buffer depth target
        FrameBuffer.copyColor(gl, this.readBuffer, this.forwardBuffer, 0);
        FrameBuffer.copyDepth(gl, this.gBuffer, this.forwardBuffer);
    
        this.forwardBuffer.bind();
        this.enableDepthTesting();

        renderPass();

        // Render out to the screen
        this.disableDepthTesting();
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this.finalShader.bind(gl);
        this.forwardColorTarget.bind(gl, 0);
        this.drawFullScreenQuad();
    }

    /**
     * Render the post processing shaders in order using a ping-pong approach.
     *
     */
    renderPostProcessingPipeline() {
        const gl = this.gl;

        this.disableDepthTesting();

        // this._clearPingPongBuffers();
        // Technically we don't have to clear the ping-pong buffers here since the subsequent copy commands
        // will override whatever is currently in the buffers.

        FrameBuffer.copyColor(gl, this.gBuffer, this.pingBuffer, 1);
        FrameBuffer.copyColor(gl, this.gBuffer, this.pongBuffer, 1);

        for (const shader of this.postShaders) {
            if (!shader.enabled) continue;

            this.writeBuffer.bind();
            shader.bind(gl);

            // Bind the correct ping-pong buffer for this iteration
            this.readBuffer === this.pingBuffer ?
                this.pingBufferColorTarget.bind(gl, this.gBuffer.numAttachments) :
                this.pongBufferColorTarget.bind(gl, this.gBuffer.numAttachments);

            this.drawFullScreenQuad();

            [this.readBuffer, this.writeBuffer] = [this.writeBuffer, this.readBuffer];
        }
    }

    /**
     * NOT USED. Render the final post processing output to the screen.
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
     * Add a shader to the post processing pipeline.
     * 
     * @param {ShaderProgram} shader 
     */
    addPostProcessingShader(shader) {
        this.postShaders.push(shader);
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
     * Set the G buffer and previous color output uniform samplers for the post processing shaders.
     */
    initializePostProcessingShaders() {
        const gl = this.gl;

        for (const shader of this.postShaders) {
            shader.bind(gl);
            shader.setUniformInt(gl, "gPosition", 0);
            shader.setUniformInt(gl, "gAlbedo", 1);
            shader.setUniformInt(gl, "gNormal", 2);
            shader.setUniformInt(gl, "gMaterial", 3);
            shader.setUniformInt(gl, "gDepth", 4);
            shader.setUniformInt(gl, "uPostColor", this.gBuffer.numAttachments);
        }
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

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }

    _checkGLError() {
        const error = this.gl.getError();
        if (error != 0)
            throw new Error("OpenGL error: " + error);
    }
}
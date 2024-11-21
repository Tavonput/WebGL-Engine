import { Renderer } from "./renderer.js";
import { ShaderProgram } from "./Core/shaders.js";
import { Mat4 } from "./Math/matrix.js";
import { Mesh } from "./Core/mesh.js";
import { Keys } from "./Core/event.js";
import { Texture } from "./Core/texture.js";
import { FrameBuffer } from "./Core/framebuffer.js";

import { vertSource, fragSource } from "./Shaders/lighting.js";
import { postVertSource, postFragSource } from "./Shaders/post.js";
import { edgeDetectionFragSource } from "./Shaders/edge_detection.js";

// ========================================================================================================================
// Main
//
function main() {
    const canvas = document.getElementById("the-canvas");
    const gl     = canvas.getContext("webgl2");

    let keyboard = Keys.startListening();

    let offscreenShader = new ShaderProgram(gl, vertSource, fragSource);
    let edgeDetectionShader = new ShaderProgram(gl, postVertSource, edgeDetectionFragSource);

    let sphereMesh = Mesh.sphere(gl, 16);
    let sphere = sphereMesh.createInstance();
    sphere.scale = Mat4.scale(0.3, 0.3, 0.3);
    sphere.translation = Mat4.translation(-0.2, 0.0, 0.0);
    
    let cubeMesh = Mesh.cube(gl, 0.5, 0.5, 0.5);
    let cube = cubeMesh.createInstance();
    cube.scale = Mat4.scale(0.5, 0.5, 0.5);
    cube.translation = Mat4.translation(0.2, 0.0, 0.0);

    let metalTexture = Texture.createFromFile(gl, "../Assets/metal_scale.png");

    let framebuffer = new FrameBuffer(gl, canvas.width, canvas.height);
    let offscreenAlbedo = framebuffer.addColorAttachment();
    let offscreenDepth = framebuffer.addDepthAttachment();

    // ==========
    /** 
     * Ran by the renderer once before rendering starts.
     * 
     * @param {Renderer} renderer  
     */
    function onInit(renderer) {
        offscreenShader.bind(gl);
        offscreenShader.setUniformMat4f(gl, "projection", renderer.camera.projection.data);
        offscreenShader.setUniformMat4f(gl, "view", renderer.camera.getView().data);
        offscreenShader.setUniformInt(gl, "debugMode", Renderer.DEBUG_NONE);

        offscreenShader.setUniformVec3f(gl, "cameraPos",
            renderer.camera.position[0], renderer.camera.position[1], renderer.camera.position[2]
        );

        offscreenShader.setUniformFloat(gl, "matAmbient", 0.25);
        offscreenShader.setUniformFloat(gl, "matDiffuse", 1.0);
        offscreenShader.setUniformFloat(gl, "matSpecular", 2.0);
        offscreenShader.setUniformFloat(gl, "matShininess", 4.0);

        offscreenShader.setUniformVec3f(gl, "lightPos", -1.0, -1.0, -1.0);
        offscreenShader.setUniformVec3f(gl, "lightColor", 1.0, 0.0, 0.0);
        offscreenShader.setUniformFloat(gl, "lightIntensity", 0.5);

        offscreenShader.setUniformVec3f(gl, "sunDir", 1.0, 1.0, 0.0);
        offscreenShader.setUniformVec3f(gl, "sunColor", 1.0, 1.0, 1.0);

        edgeDetectionShader.bind(gl);
        edgeDetectionShader.setUniformInt(gl, "albedoTexture", 0);
        edgeDetectionShader.setUniformInt(gl, "depthTexture", 1);
        
        edgeDetectionShader.setUniformVec2f(gl, "texelSize", 1 / framebuffer.width, 1 / framebuffer.height);
        edgeDetectionShader.setUniformVec4f(gl, "outlineColor", 0.0, 0.0, 0.0, 1.0);
    }

    /**
     * Ran by the renderer every render frame.
     * 
     * @param {Renderer} renderer 
     */
    function onRender(renderer) {
        // Offscreen pass
        framebuffer.bind();
        renderer.setClearColor(0.2, 0.2, 0.2, 1.0);
        renderer.clearRenderTargets();
        renderer.enableDepthTesting();

        metalTexture.bind(gl, 0);
        sphere.draw(gl, offscreenShader);
        cube.draw(gl, offscreenShader);
        framebuffer.unbind();

        // Start post processing
        renderer.disableDepthTesting();
        offscreenAlbedo.bind(gl, 0);
        offscreenDepth.bind(gl, 1);

        // Edge detection pass
        edgeDetectionShader.bind(gl);
        renderer.drawFullScreenQuad();
}
    
    /** 
     * Ran by the renderer every update.
     * 
     * @param {Renderer} renderer 
     */
    function onUpdate(renderer) {
        renderer.updateCamera(keyboard);

        offscreenShader.bind(gl);
        offscreenShader.setUniformVec3f(gl, "cameraPos",
            renderer.camera.position[0], renderer.camera.position[1], renderer.camera.position[2]
        );

        offscreenShader.bind(gl);
        offscreenShader.setUniformMat4f(gl, "view", renderer.camera.getView().data);
    }
    // ==========

    let renderer = new Renderer(gl, canvas.width, canvas.height, onInit, onRender, onUpdate);
    renderer.updatesPerSecond = 60;
    renderer.run();
}

main();
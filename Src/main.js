import { Renderer } from "./renderer.js";
import { ShaderProgram } from "./Core/shaders.js";
import { Mat4 } from "./Math/matrix.js";
import { Mesh } from "./Core/mesh.js";
import { Keys } from "./Core/event.js";
import { Texture } from "./Core/texture.js";
import { FrameBuffer } from "./Core/framebuffer.js";

import { GBufferShader } from "./Shaders/geometry.js";
import { LightingShader } from "./Shaders/lighting.js";
import { PostShader } from "./Shaders/post.js";
import { EdgeDetectionShader } from "./Shaders/edge_detection.js";
import { GrayScaleShader } from "./Shaders/grayscale.js";

// ========================================================================================================================
// Main
//
function main() {
    const canvas = document.getElementById("the-canvas");
    const gl = canvas.getContext("webgl2");
    const ext = gl.getExtension("EXT_color_buffer_float");

    // Renderer
    let renderer = new Renderer(gl, canvas.width, canvas.height);
    renderer.updatesPerSecond = 60;

    // Keyboard
    let keyboard = Keys.startListening();

    // Shader programs
    let gBufferShader = new ShaderProgram(gl, GBufferShader.vertSource, GBufferShader.fragSource);
    let lightingShader = new ShaderProgram(gl, PostShader.vertSource, LightingShader.fragSource);
    let edgeDetectionShader = new ShaderProgram(gl, PostShader.vertSource, EdgeDetectionShader.fragSource);
    let grayScaleShader = new ShaderProgram(gl, PostShader.vertSource, GrayScaleShader.fragSource);

    renderer.addPostProcessingShader(lightingShader);
    renderer.addPostProcessingShader(edgeDetectionShader);
    renderer.addPostProcessingShader(grayScaleShader);

    // Menu stuff for the post processing shaders. Will probably refactor later.
    document.getElementById("lightingEnabled").addEventListener("input", (event) => {
        lightingShader.enabled = event.target.checked;
    });

    document.getElementById("edgeDetectionEnabled").addEventListener("input", (event) => {
        edgeDetectionShader.enabled = event.target.checked;
    });

    document.getElementById("edgeDetectionType").addEventListener("input", (event) => {
        edgeDetectionShader.bind(gl);
        if (event.target.value === "depth")
            edgeDetectionShader.setUniformInt(gl, "uDetectionType", EdgeDetectionShader.DETECTION_DEPTH);
        else if (event.target.value === "albedo")
            edgeDetectionShader.setUniformInt(gl, "uDetectionType", EdgeDetectionShader.DETECTION_ALBEDO);
    });

    document.getElementById("edgeDetectionColor").addEventListener("input", (event) => {
        const hexColor = parseInt(event.target.value.slice(1), 16); // Removes the #
        edgeDetectionShader.bind(gl);
        
        // Hex to RGB float
        edgeDetectionShader.setUniformVec3f(gl, "uOutlineColor",
            ((hexColor >> 16) & 255) / 255,
            ((hexColor >> 8) & 255) / 255,
            (hexColor & 255) / 255,
        );
    });

    document.getElementById("grayScaleEnabled").addEventListener("input", (event) => {
        grayScaleShader.enabled = event.target.checked;
    });
    
    // Meshes
    let sphereMesh = Mesh.sphere(gl, 16);
    let sphere = sphereMesh.createInstance();
    sphere.scale = Mat4.scale(0.3, 0.3, 0.3);
    sphere.translation = Mat4.translation(-0.2, 0.0, 0.0);
    
    let cubeMesh = Mesh.cube(gl, 0.5, 0.5, 0.5);
    let cube = cubeMesh.createInstance();
    cube.scale = Mat4.scale(0.5, 0.5, 0.5);
    cube.translation = Mat4.translation(0.2, 0.0, 0.0);

    let metalTexture = Texture.createFromFile(gl, "../Assets/metal_scale.png");
    let ivyTexture = Texture.createFromFile(gl, "../Assets/ivy_seamless.png");

    // G Buffer
    let gBuffer = new FrameBuffer(gl, canvas.width, canvas.height);
    let gBufferPosTarget = gBuffer.addColorAttachment(FrameBuffer.COLOR_TYPE_FLOAT);
    let gBufferAlbedoTarget = gBuffer.addColorAttachment(FrameBuffer.COLOR_TYPE_INT);
    let gBufferNormalTarget = gBuffer.addColorAttachment(FrameBuffer.COLOR_TYPE_FLOAT);
    let gBufferDepthTarget = gBuffer.addDepthAttachment();

    // ==========
    /** 
     * Ran by the renderer once before rendering starts.
     * 
     * @param {Renderer} renderer  
     */
    function onInit(renderer) {

        // All of the post processing shaders must have the same first set of textures.
        function setPostProcessingTextureSlots(shader) {
            shader.setUniformInt(gl, "gPosition", 0);
            shader.setUniformInt(gl, "gAlbedo", 1);
            shader.setUniformInt(gl, "gNormal", 2);
            shader.setUniformInt(gl, "gDepth", 3);
            shader.setUniformInt(gl, "uPostColor", gBuffer.numAttachments);    
        }

        // G Buffer uniforms
        gBufferShader.bind(gl);
        gBufferShader.setUniformMat4f(gl, "uProjection", renderer.camera.projection.data);
        gBufferShader.setUniformMat4f(gl, "uView", renderer.camera.getView().data);
        
        // Lighting uniforms
        lightingShader.bind(gl);
        setPostProcessingTextureSlots(lightingShader);

        lightingShader.setUniformVec3f(gl, "uCameraPos",
            renderer.camera.position[0], renderer.camera.position[1], renderer.camera.position[2]
        );

        lightingShader.setUniformFloat(gl, "uMatAmbient", 0.25);
        lightingShader.setUniformFloat(gl, "uMatDiffuse", 1.0);
        lightingShader.setUniformFloat(gl, "uMatSpecular", 2.0);
        lightingShader.setUniformFloat(gl, "uMatShininess", 4.0);

        lightingShader.setUniformVec3f(gl, "uLightPos", -1.0, -1.0, -1.0);
        lightingShader.setUniformVec3f(gl, "uLightColor", 1.0, 0.0, 0.0);
        lightingShader.setUniformFloat(gl, "uLightIntensity", 0.5);

        lightingShader.setUniformVec3f(gl, "uSunDir", 1.0, 1.0, 0.0);
        lightingShader.setUniformVec3f(gl, "uSunColor", 1.0, 1.0, 1.0);

        // Edge detection uniforms
        edgeDetectionShader.bind(gl);
        setPostProcessingTextureSlots(edgeDetectionShader);
        
        edgeDetectionShader.setUniformVec2f(gl, "uTexelSize", 1 / gBuffer.width, 1 / gBuffer.height);
        edgeDetectionShader.setUniformVec3f(gl, "uOutlineColor", 0.0, 0.0, 0.0);
        edgeDetectionShader.setUniformInt(gl, "uDetectionType", EdgeDetectionShader.DETECTION_ALBEDO);

        // Grey scale uniforms
        grayScaleShader.bind(gl);
        setPostProcessingTextureSlots(grayScaleShader);
    }

    /**
     * Ran by the renderer every render frame.
     * 
     * @param {Renderer} renderer 
     */
    function onRender(renderer) {
        // Geometry pass
        {
            gBuffer.bind();

            renderer.setClearColor(0.9, 0.9, 0.9, 1.0);
            renderer.clearRenderTargets();
            renderer.enableDepthTesting();

            metalTexture.bind(gl, 0);
            sphere.draw(gl, gBufferShader);

            ivyTexture.bind(gl, 0);
            cube.draw(gl, gBufferShader);

            gBuffer.unbind();
        }
    
        // Post processing pass
        {
            gBufferPosTarget.bind(gl, 0);
            gBufferAlbedoTarget.bind(gl, 1);
            gBufferNormalTarget.bind(gl, 2);
            gBufferDepthTarget.bind(gl, 3);
            
            renderer.renderPostProcessingPipeline(gBuffer, 1, gBuffer.numAttachments);
        }
        
        // Final pass
        renderer.renderFinalScreen();
    }
    
    /** 
     * Ran by the renderer every update.
     * 
     * @param {Renderer} renderer 
     */
    function onUpdate(renderer) {
        renderer.updateCamera(keyboard);

        lightingShader.bind(gl);
        lightingShader.setUniformVec3f(gl, "uCameraPos",
            renderer.camera.position[0], renderer.camera.position[1], renderer.camera.position[2]
        );

        gBufferShader.bind(gl);
        gBufferShader.setUniformMat4f(gl, "uView", renderer.camera.getView().data);
    }
    // ==========

    renderer.onInit = onInit;
    renderer.onRender = onRender;
    renderer.onUpdate = onUpdate;

    renderer.run();
}

main();
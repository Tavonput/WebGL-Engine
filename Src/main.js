import { Renderer } from "./renderer.js";
import { ShaderProgram } from "./Core/shaders.js";
import { Mat4 } from "./Math/matrix.js";
import { Mesh } from "./Core/mesh.js";
import { Keys } from "./Core/event.js";
import { Texture } from "./Core/texture.js";
import { FrameBuffer } from "./Core/framebuffer.js";

import { GBufferShader } from "./Shaders/geometry.js";
import { PhongShader, ToonShader, DirLight, PointLight } from "./Shaders/lighting.js";
import { LightBoxShader } from "./Shaders/light_box.js";
import { PostShader } from "./Shaders/post.js";
import { EdgeDetectionShader } from "./Shaders/edge_detection.js";
import { GrayScaleShader } from "./Shaders/grayscale.js";
import { HalftoneShader } from "./Shaders/halftone.js";

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
    let lightBoxShader = new ShaderProgram(gl, LightBoxShader.vertSource, LightBoxShader.fragSource);
    let phongShader = new ShaderProgram(gl, PostShader.vertSource, PhongShader.fragSource);
    let toonShader = new ShaderProgram(gl, PostShader.vertSource, ToonShader.fragSource);
    let edgeDetectionShader = new ShaderProgram(gl, PostShader.vertSource, EdgeDetectionShader.fragSource);
    let grayScaleShader = new ShaderProgram(gl, PostShader.vertSource, GrayScaleShader.fragSource);
    let halftoneShader = new ShaderProgram(gl, PostShader.vertSource, HalftoneShader.fragSource);

    grayScaleShader.enabled = false;
    phongShader.enabled = false;

    renderer.addPostProcessingShader(toonShader);
    renderer.addPostProcessingShader(phongShader);
    renderer.addPostProcessingShader(halftoneShader); 
    renderer.addPostProcessingShader(edgeDetectionShader);
    renderer.addPostProcessingShader(grayScaleShader);

    // Menu stuff for the post processing shaders. Will probably refactor later.
    let currentLightingShader = toonShader;
    document.getElementById("lightingEnabled").addEventListener("input", (event) => {
        if (event.target.checked)
            currentLightingShader.enabled = event.target.checked;
        else {
            toonShader.enabled = event.target.checked;
            phongShader.enabled = event.target.checked;
        }
    });
    document.getElementById("lightingMethod").addEventListener("input", (event) => {
        if (event.target.value === "toon") {
            toonShader.enabled = true;
            currentLightingShader = toonShader;
            phongShader.enabled = false;
        }
        else if (event.target.value === "phong") {
            phongShader.enabled = true;
            currentLightingShader = phongShader;
            toonShader.enabled = false;
        }
    });

    document.getElementById("toonSteps").addEventListener("input", (event) => {
        toonShader.bind(gl);
        toonShader.setUniformFloat(gl, "uSteps", parseFloat(event.target.value));
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

    document.getElementById("halftoneEnabled").addEventListener("input", (event) => {
        halftoneShader.enabled = event.target.checked;
    });

    document.getElementById("halftoneSteps").addEventListener("input", (event) => {
        halftoneShader.bind(gl);
        halftoneShader.setUniformFloat(gl, "uSteps", parseFloat(event.target.value));
    });

    document.getElementById("halftoneScale").addEventListener("input", (event) => {
        halftoneShader.bind(gl);
        halftoneShader.setUniformFloat(gl, "uScale", parseFloat(event.target.value));
    });

    document.getElementById("halftoneIntensity").addEventListener("input", (event) => {
        halftoneShader.bind(gl);
        halftoneShader.setUniformFloat(gl, "uIntensity", parseFloat(event.target.value));
    });

    document.getElementById("grayScaleEnabled").addEventListener("input", (event) => {
        grayScaleShader.enabled = event.target.checked;
    });

    document.getElementById("grayScaleSteps").addEventListener("input", (event) => {
        grayScaleShader.bind(gl);
        grayScaleShader.setUniformFloat(gl, "uSteps", parseFloat(event.target.value));
    });
    
    // Meshes
    let sphereMesh = Mesh.sphere(gl, 16);
    let sphere = sphereMesh.createInstance();
    sphere.scale = Mat4.scale(0.5, 0.5, 0.5);
    sphere.translation = Mat4.translation(-0.4, 0.0, 0.0);
    
    let cubeMesh = Mesh.cube(gl, 0.5, 0.5, 0.5);
    let cube = cubeMesh.createInstance();
    cube.scale = Mat4.scale(0.8, 0.8, 0.8);
    cube.translation = Mat4.translation(0.4, 0.0, 0.0);

    let metalTexture = Texture.createFromFile(gl, "../Assets/metal_scale.png");
    let ivyTexture = Texture.createFromFile(gl, "../Assets/ivy_seamless.png");

    // G Buffer
    let gBuffer = new FrameBuffer(gl, canvas.width, canvas.height);
    let gBufferPosTarget = gBuffer.addColorAttachment(FrameBuffer.COLOR_TYPE_FLOAT);
    let gBufferAlbedoTarget = gBuffer.addColorAttachment(FrameBuffer.COLOR_TYPE_INT);
    let gBufferNormalTarget = gBuffer.addColorAttachment(FrameBuffer.COLOR_TYPE_FLOAT);
    let gBufferDepthTarget = gBuffer.addDepthAttachment();

    // Forward buffer
    let forwardBuffer = new FrameBuffer(gl, canvas.width, canvas.height);
    let forwardColorTarget = forwardBuffer.addColorAttachment(FrameBuffer.COLOR_TYPE_INT);
    let forwardDepthTarget = forwardBuffer.addDepthAttachment();

    // Lights
    const dirLight = new DirLight([1.0, 1.0, 0.0], [1.0, 1.0, 1.0], 0.5);
    const pointLightData = [
        // Position          Color            Intensity
        [[-0.7, -0.7, -0.7], [1.0, 0.0, 0.0], 0.5],
        [[-0.7,  0.7,  0.0], [0.0, 0.0, 1.0], 0.5],
        [[ 0.7,  0.0,  0.7], [0.0, 1.0, 0.0], 0.3],
    ];
    let pointLights = []
    let lightBoxes = []
    for (const data of pointLightData) {
        pointLights.push(new PointLight(data[0], data[1], data[2]));

        let box = cubeMesh.createInstance();
        box.scale = Mat4.scale(0.2, 0.2, 0.2);
        box.translation = Mat4.translation(data[0][0], data[0][1], data[0][2]);
        lightBoxes.push(box);
    }

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
        for (const shader of [phongShader, toonShader]) {
            shader.bind(gl);
            setPostProcessingTextureSlots(shader);

            shader.setUniformVec3f(gl, "uCameraPos",
                renderer.camera.position[0], renderer.camera.position[1], renderer.camera.position[2]
            );

            shader.setUniformFloat(gl, "uMatAmbient", 0.25);
            shader.setUniformFloat(gl, "uMatDiffuse", 1.0);
            shader.setUniformFloat(gl, "uMatSpecular", 2.0);
            shader.setUniformFloat(gl, "uMatShininess", 4.0);

            dirLight.setUniforms(gl, shader, "uDirLight");
            for (let i = 0; i < pointLights.length; i++)
                pointLights[i].setUniforms(gl, shader, "uPointLights", i);

            shader.setUniformInt(gl, "uNumPointLights", pointLights.length);
        }
        toonShader.setUniformFloat(gl, "uSteps", 3.0);
        
        // Edge detection uniforms
        edgeDetectionShader.bind(gl);
        setPostProcessingTextureSlots(edgeDetectionShader);
        
        edgeDetectionShader.setUniformVec2f(gl, "uTexelSize", 1 / gBuffer.width, 1 / gBuffer.height);
        edgeDetectionShader.setUniformVec3f(gl, "uOutlineColor", 0.0, 0.0, 0.0);
        edgeDetectionShader.setUniformInt(gl, "uDetectionType", EdgeDetectionShader.DETECTION_DEPTH);

        // Halftone uniforms
        halftoneShader.bind(gl);
        setPostProcessingTextureSlots(halftoneShader);
        halftoneShader.setUniformFloat(gl, "uSteps", 3.0);
        halftoneShader.setUniformFloat(gl, "uScale", 2.8);
        halftoneShader.setUniformFloat(gl, "uIntensity", 0.05);

        // Grey scale uniforms
        grayScaleShader.bind(gl);
        setPostProcessingTextureSlots(grayScaleShader);
        grayScaleShader.setUniformFloat(gl, "uSteps", 8.0);

        // Light box uniforms
        lightBoxShader.bind(gl);
        lightBoxShader.setUniformMat4f(gl, "uProjection", renderer.camera.projection.data);
        lightBoxShader.setUniformMat4f(gl, "uView", renderer.camera.getView().data);
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
            // Bind the G buffer
            gBufferPosTarget.bind(gl, 0);
            gBufferAlbedoTarget.bind(gl, 1);
            gBufferNormalTarget.bind(gl, 2);
            gBufferDepthTarget.bind(gl, 3);
            
            // Render the post processing shaders in order
            renderer.renderPostProcessingPipeline(gBuffer, 1, gBuffer.numAttachments);
            renderer.finalizePostProcessing();
        }

        // Final forward pass
        //
        // This one is a bit jank. Usually we would just copy the G buffer depth attachment to the default framebuffer's depth attachment,
        // then continue with rendering. This approach is descried in the LearnOpenGL Deferred Shading chapter. But, unfortunately 
        // WebGL does not seem to allow us to manually copy data into the default depth attachment, thus we have to work around this.
        // Instead, we will setup an intermediate framebuffer where we can copy the G buffer depth attachment to. We will also copy the
        // result of the post processing color attachment to the intermediate framebuffer's main color attachment. Then we can render to
        // the intermediate framebuffer and write the final result in one last pass to the screen.
        {
            FrameBuffer.copyColor(gl, renderer.readBuffer, forwardBuffer, 0);
            FrameBuffer.copyDepth(gl, gBuffer, forwardBuffer);
        
            forwardBuffer.bind();
            renderer.enableDepthTesting();

            lightBoxShader.bind(gl);
            for (let i = 0; i < lightBoxes.length; i++) {
                lightBoxShader.setUniformVec3f(gl, "uLightColor", pointLights[i].color[0], pointLights[i].color[1], pointLights[i].color[2]);
                lightBoxes[i].draw(gl, lightBoxShader);
            }

            renderer.disableDepthTesting();
            renderer.bindScreenFramebuffer();
            renderer.finalShader.bind(gl);
            forwardColorTarget.bind(gl, 0);
            renderer.drawFullScreenQuad();
        }
    }
    
    /** 
     * Ran by the renderer every update.
     * 
     * @param {Renderer} renderer 
     */
    function onUpdate(renderer) {
        renderer.updateCamera(keyboard);

        for (const shader of [phongShader, toonShader]) {
            shader.bind(gl);
            shader.setUniformVec3f(gl, "uCameraPos",
                renderer.camera.position[0], renderer.camera.position[1], renderer.camera.position[2]
            );
        }
        
        gBufferShader.bind(gl);
        gBufferShader.setUniformMat4f(gl, "uView", renderer.camera.getView().data);

        lightBoxShader.bind(gl);
        lightBoxShader.setUniformMat4f(gl, "uView", renderer.camera.getView().data);
    }
    // ==========

    renderer.onInit = onInit;
    renderer.onRender = onRender;
    renderer.onUpdate = onUpdate;

    renderer.run();
}

main();
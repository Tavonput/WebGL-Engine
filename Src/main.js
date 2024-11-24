import { Renderer } from "./renderer.js";
import { ShaderProgram } from "./Core/shaders.js";
import { Mat4 } from "./Math/matrix.js";
import { Material, Mesh } from "./Core/mesh.js";
import { Keys, Menu } from "./Core/event.js";
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
    renderer.setClearColor(0.9, 0.9, 0.9, 1.0);

    // Keyboard
    let keyboard = Keys.startListening();

    // Shader programs
    let lightBoxShader = new ShaderProgram(gl, LightBoxShader.vertSource, LightBoxShader.fragSource);
    let phongShader = new ShaderProgram(gl, PostShader.vertSource, PhongShader.fragSource);
    let toonShader = new ShaderProgram(gl, PostShader.vertSource, ToonShader.fragSource);
    let edgeDetectionShader = new ShaderProgram(gl, PostShader.vertSource, EdgeDetectionShader.fragSource);
    let grayScaleShader = new ShaderProgram(gl, PostShader.vertSource, GrayScaleShader.fragSource);
    let halftoneShader = new ShaderProgram(gl, PostShader.vertSource, HalftoneShader.fragSource);

    grayScaleShader.enabled = false;
    phongShader.enabled = false;

    // Post processing shaders are ran in the order they are added
    renderer.addPostProcessingShader(toonShader);
    renderer.addPostProcessingShader(phongShader);
    renderer.addPostProcessingShader(halftoneShader); 
    renderer.addPostProcessingShader(edgeDetectionShader);
    renderer.addPostProcessingShader(grayScaleShader);

    // Meshes
    let sphereMesh = Mesh.sphere(gl, 16);
    let sphere = sphereMesh.createInstance();
    sphere.scale = Mat4.scale(0.5, 0.5, 0.5);
    sphere.translation = Mat4.translation(-0.4, 0.0, 0.0);

    let cubeMesh = Mesh.cube(gl, 0.5, 0.5, 0.5);
    let cube = cubeMesh.createInstance();
    cube.scale = Mat4.scale(0.8, 0.8, 0.8);
    cube.translation = Mat4.translation(0.4, 0.0, 0.0);

    // Materials
    let sphereMaterial = new Material(0.2, 1.0, 2.0, 4.0);
    let cubeMaterial = new Material(0.2, 1.0, 1.0, 2.0);
    let metalTexture = Texture.createFromFile(gl, "../Assets/metal_scale.png");
    let ivyTexture = Texture.createFromFile(gl, "../Assets/ivy_seamless.png");

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

    // Lighting menu items
    let currentLightingShader = toonShader;
    Menu.addCustomCheckBox("lightingEnabled", (checked) => {
        if (checked)
            currentLightingShader.enabled = checked;
        else {
            toonShader.enabled = checked;
            phongShader.enabled = checked;
        }
    });
    Menu.addDropDown("lightingMethod", (method) => {
        if (method === "toon") {
            toonShader.enabled = true;
            currentLightingShader = toonShader;
            phongShader.enabled = false;
        }
        else if (method === "phong") {
            phongShader.enabled = true;
            currentLightingShader = phongShader;
            toonShader.enabled = false;
        }
    });
    Menu.addFloatSlider(gl, toonShader, "toonSteps", "uSteps");
    
    // Edge detection menu items
    Menu.addCheckBox(gl, edgeDetectionShader, "edgeDetectionEnabled");
    Menu.addDropDown("edgeDetectionType", (value) => {
        edgeDetectionShader.bind(gl);
        if (value === "depth")
            edgeDetectionShader.setUniformInt(gl, "uDetectionType", EdgeDetectionShader.DETECTION_DEPTH);
        else if (value === "albedo")
            edgeDetectionShader.setUniformInt(gl, "uDetectionType", EdgeDetectionShader.DETECTION_ALBEDO);
    });
    Menu.addColorPicker(gl, edgeDetectionShader, "edgeDetectionColor", "uOutlineColor");

    // Halftone menu items
    Menu.addCheckBox(gl, halftoneShader, "halftoneEnabled");
    Menu.addFloatSlider(gl, halftoneShader, "halftoneSteps", "uSteps");
    Menu.addFloatSlider(gl, halftoneShader, "halftoneScale", "uScale");
    Menu.addFloatSlider(gl, halftoneShader, "halftoneIntensity", "uIntensity");

    // Grayscale menu items
    Menu.addCheckBox(gl, grayScaleShader, "grayScaleEnabled");
    Menu.addFloatSlider(gl, grayScaleShader, "grayScaleSteps", "uSteps");

    // ==========
    /** 
     * Ran by the renderer once before rendering starts.
     * 
     * @param {Renderer} renderer  
     */
    function onInit(renderer) {
        // Lighting uniforms
        for (const shader of [phongShader, toonShader]) {
            shader.bind(gl);

            shader.setUniformVec3f(gl, "uCameraPos",
                renderer.camera.position[0], renderer.camera.position[1], renderer.camera.position[2]
            );

            dirLight.setUniforms(gl, shader, "uDirLight");
            for (let i = 0; i < pointLights.length; i++)
                pointLights[i].setUniforms(gl, shader, "uPointLights", i);

            shader.setUniformInt(gl, "uNumPointLights", pointLights.length);
        }
        toonShader.setUniformFloat(gl, "uSteps", 3.0);
        
        // Edge detection uniforms
        edgeDetectionShader.bind(gl);
        edgeDetectionShader.setUniformVec2f(gl, "uTexelSize", 1 / renderer.gBuffer.width, 1 / renderer.gBuffer.height);
        edgeDetectionShader.setUniformVec3f(gl, "uOutlineColor", 0.0, 0.0, 0.0);
        edgeDetectionShader.setUniformInt(gl, "uDetectionType", EdgeDetectionShader.DETECTION_DEPTH);

        // Halftone uniforms
        halftoneShader.bind(gl);
        halftoneShader.setUniformFloat(gl, "uSteps", 3.0);
        halftoneShader.setUniformFloat(gl, "uScale", 2.8);
        halftoneShader.setUniformFloat(gl, "uIntensity", 0.05);

        // Grey scale uniforms
        grayScaleShader.bind(gl);
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
        renderer.geometryPass(() => {
            sphereMaterial.setUniforms(gl, renderer.gBufferShader);
            metalTexture.bind(gl, 0);
            sphere.draw(gl, renderer.gBufferShader);

            cubeMaterial.setUniforms(gl, renderer.gBufferShader);
            ivyTexture.bind(gl, 0);
            cube.draw(gl, renderer.gBufferShader);
        });

        renderer.postProcessingPass(() => {
            // Just render the post processing shaders that we added to the renderer earlier
            renderer.renderPostProcessingPipeline();
        });
        
        renderer.finalForwardPass(() => {
            lightBoxShader.bind(gl);
            for (let i = 0; i < lightBoxes.length; i++) {
                lightBoxShader.setUniformVec3f(gl, "uLightColor", pointLights[i].color[0], pointLights[i].color[1], pointLights[i].color[2]);
                lightBoxes[i].draw(gl, lightBoxShader);
            }
        });
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
        
        renderer.gBufferShader.bind(gl);
        renderer.gBufferShader.setUniformMat4f(gl, "uView", renderer.camera.getView().data);

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
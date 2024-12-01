import { Renderer } from "./renderer.js";
import { ShaderProgram } from "./Core/shaders.js";
import { Vec4 } from "./Math/vector.js";
import { Mat4 } from "./Math/matrix.js";
import { Material, Mesh } from "./Core/mesh.js";
import { Keys, Menu } from "./Core/event.js";
import { Texture } from "./Core/texture.js";
import { SceneGraph, Node } from "./scene.js";
import { Camera } from "./camera.js";

import { PhongShader, ToonShader, DirLight, PointLight } from "./Shaders/lighting.js";
import { LightBoxShader } from "./Shaders/light_box.js";
import { PostShader } from "./Shaders/post.js";
import { EdgeDetectionShader } from "./Shaders/edge_detection.js";
import { GrayScaleShader } from "./Shaders/grayscale.js";
import { HalftoneShader } from "./Shaders/halftone.js";
import { SkyboxShaders } from "./Shaders/skybox.js";

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
    let skyboxShader = new ShaderProgram (gl, SkyboxShaders.vertSource, SkyboxShaders.fragSource );

    // Load Cubemap Textures
    let cubemapTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubemapTexture);

    const faces = [
        { target: gl.TEXTURE_CUBE_MAP_POSITIVE_X, url: '../Assets/skybox/right.jpg' }, // right
        { target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X, url: '../Assets/skybox/left.jpg' },  // left
        { target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y, url: '../Assets/skybox/top.jpg' },   // top
        { target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, url: '../Assets/skybox/bottom.jpg' }, // bottom
        { target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z, url: '../Assets/skybox/front.jpg' },  // front
        { target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, url: '../Assets/skybox/back.jpg' },   // back
    ];

    let imagesLoaded = 0;

    faces.forEach((face) => {
        const { target, url } = face;
        const image = new Image();
        image.onload = function() {
            gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubemapTexture);
            gl.texImage2D(target, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            imagesLoaded++;
            if (imagesLoaded === 6) {
                gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
            }
        };
        image.src = url;
    });

    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);

    grayScaleShader.enabled = false;
    phongShader.enabled = false;

    // Post processing shaders are ran in the order they are added
    renderer.addPostProcessingShader(toonShader);
    renderer.addPostProcessingShader(phongShader);
    renderer.addPostProcessingShader(halftoneShader); 
    renderer.addPostProcessingShader(edgeDetectionShader);
    renderer.addPostProcessingShader(grayScaleShader);

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

    // Meshes and objects
    let sphereMesh = Mesh.sphere(gl, 16);
    let cubeMesh = Mesh.cube(gl, 0.5, 0.5, 0.5);
    let skyboxMesh = Mesh.cube(gl, 2, 2, 2 );

    let sphere = sphereMesh.createInstance();
    sphere.material = new Material(0.2, 1.0, 2.0, 4.0);
    sphere.texture = Texture.createFromFile(gl, "../Assets/metal_scale.png");

    let mainCube = cubeMesh.createInstance();
    mainCube.material = new Material(0.2, 1.0, 1.0, 2.0);
    mainCube.texture = Texture.createFromFile(gl, "../Assets/ivy_seamless.png");

    let lightCube = cubeMesh.createInstance();

    // Scene graph
    // root
    //   camera
    //   sphere
    //   cube
    //   dir light
    //
    //   point light
    //     box
    //   point light
    //     box
    //   ...
    const scene = new SceneGraph();

    let gCamera = scene.root.addChild(Node.TYPE_CAMERA);
    gCamera.data = new Camera(canvas.width / canvas.height);
    gCamera.position = new Vec4(0.0, 0.0, -1.0);

    let gSphere = scene.root.addChild(Node.TYPE_MESH_GEOMETRY);
    gSphere.data = sphere;
    gSphere.position = new Vec4(-0.4, 0.0, 0.0);
    gSphere.scale = new Vec4(0.5, 0.5, 0.5);

    let gCube = scene.root.addChild(Node.TYPE_MESH_GEOMETRY);
    gCube.data = mainCube;
    gCube.position = new Vec4(0.4, 0.0, 0.0);
    gCube.scale = new Vec4(0.8, 0.8, 0.8);

    let gDirLight = scene.root.addChild(Node.TYPE_LIGHT);
    gDirLight.data = new DirLight([1.0, 1.0, 0.0], [1.0, 1.0, 1.0], 0.5);

    const pointLightData = [
        // Position          Color            Intensity
        [[-0.7, -0.7, -0.7], [1.0, 0.0, 0.0], 0.5],
        [[-0.7,  0.7,  0.0], [0.0, 0.0, 1.0], 0.5],
        [[ 0.7,  1.0,  0.7], [0.0, 1.0, 0.0], 0.3],
    ];

    let gPointLights = []
    for (const data of pointLightData) {
        let light = scene.root.addChild(Node.TYPE_LIGHT);
        light.data = new PointLight(data[0], data[1], data[2]);
        light.position = new Vec4(data[0][0], data[0][1], data[0][2]);
        
        let box = light.addChild(Node.TYPE_MESH_FORWARD);
        box.data = lightCube;
        box.scale = new Vec4(0.2, 0.2, 0.2);

        gPointLights.push(light);
    }

    scene.generateRenderJobs();

    // ==========
    /** 
     * Ran by the renderer once before rendering starts.
     * 
     * @param {Renderer} renderer  
     */
    function onInit(renderer) {
        let camera = scene.cameras[0];
        let cameraPos = camera.getPosition();

        // G buffer uniforms
        renderer.gBufferShader.bind(gl);
        renderer.gBufferShader.setUniformMat4f(gl, "uProjection", camera.getProjection().data);
        renderer.gBufferShader.setUniformMat4f(gl, "uView", camera.getView().data);

        // Lighting uniforms
        for (const shader of [phongShader, toonShader]) {
            shader.bind(gl);

            shader.setUniformVec3f(gl, "uCameraPos", cameraPos.x, cameraPos.y, cameraPos.z);

            let numDirLights = 0;
            let numPointLights = 0;
            for (const light of scene.lights) {
                if (light.light instanceof DirLight) {
                    light.light.setUniforms(gl, shader, "uDirLights", numDirLights);
                    numDirLights++;
                }
                else if (light.light instanceof PointLight) {
                    light.light.setUniforms(gl, shader, "uPointLights", numPointLights);
                    numPointLights++;
                }
            }

            shader.setUniformInt(gl, "uNumDirLights", numDirLights);
            shader.setUniformInt(gl, "uNumPointLights", numPointLights);
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
        lightBoxShader.setUniformMat4f(gl, "uProjection", camera.getProjection().data);
        lightBoxShader.setUniformMat4f(gl, "uView", camera.getView().data);

        // Skybox uniform
        let skyboxview = new Mat4(camera.getView().data.slice());
        skyboxview.data[3] = 0;
        skyboxview.data[7] = 0;
        skyboxview.data[11] = 0;

        skyboxShader.bind(gl);
        skyboxShader.setUniformMat4f(gl, "uProjection", camera.getProjection().data);
        skyboxShader.setUniformMat4f(gl, "uView", skyboxview.data);
    }

    /**
     * Ran by the renderer every render frame.
     * 
     * @param {Renderer} renderer 
     */
    function onRender(renderer) {
        scene.generateRenderJobs();

        // TODO:
        // - This geometry pass probably doesn't change, so maybe this code can be put in the renderer class.
        // - It would be nice to sort the geometry meshes by material first before rendering.
        renderer.geometryPass(() => {
            renderer.gBufferShader.bind(gl);
            for (const geometryMesh of scene.geometryMeshes) {
                renderer.gBufferShader.setUniformMat4f(gl, "uModel", geometryMesh.model.data);

                if (geometryMesh.mesh.material !== null)
                    geometryMesh.mesh.material.setUniforms(gl, renderer.gBufferShader);

                if (geometryMesh.mesh.texture !== null)
                    geometryMesh.mesh.texture.bind(gl, 0);

                geometryMesh.mesh.draw(gl, renderer.gBufferShader);
            }
        });

        renderer.postProcessingPass(() => {
            // Just render the post processing shaders that we added to the renderer earlier
            renderer.renderPostProcessingPipeline();
        });
        
        renderer.finalForwardPass(() => {
            lightBoxShader.bind(gl);
            for (const [i, forwardMesh] of scene.forwardMeshes.entries()) {
                lightBoxShader.setUniformMat4f(gl, "uModel", forwardMesh.model.data);
                lightBoxShader.setUniformVec3f(gl, "uLightColor", pointLightData[i][1][0], pointLightData[i][1][1], pointLightData[i][1][2]);
                forwardMesh.mesh.draw(gl, lightBoxShader);
            }
            //draw skybox
            gl.disable(gl.CULL_FACE);
            gl.depthFunc(gl.LEQUAL);
            skyboxShader.bind(gl);
            gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubemapTexture);
            skyboxMesh.vertexBuffer.bind(gl);
            skyboxMesh.indexBuffer.bind(gl);
            skyboxMesh.indexBuffer.draw(gl);
            gl.depthFunc(gl.LESS);
            gl.enable(gl.CULL_FACE);


        });

    }
    
    /** 
     * Ran by the renderer every update.
     * 
     * @param {Renderer} renderer 
     */
    function onUpdate(renderer) {
        scene.updateNode(gCamera, keyboard, renderer.deltaTimeUpdate);
        
        let camera = scene.cameras[0];

        let cameraPos = camera.getPosition();
        for (const shader of [phongShader, toonShader]) {
            shader.bind(gl);
            shader.setUniformVec3f(gl, "uCameraPos", cameraPos.x, cameraPos.y, cameraPos.z);
        }
        
        renderer.gBufferShader.bind(gl);
        renderer.gBufferShader.setUniformMat4f(gl, "uView", camera.getView().data);

        lightBoxShader.bind(gl);
        lightBoxShader.setUniformMat4f(gl, "uView", camera.getView().data);

        // Skybox uniform
        let skyboxview = new Mat4(camera.getView().data.slice());
        skyboxview.data[3] = 0;
        skyboxview.data[7] = 0;
        skyboxview.data[11] = 0;

        skyboxShader.bind(gl);
        skyboxShader.setUniformMat4f(gl, "uView", skyboxview.data);
    }
    // ==========

    renderer.onInit = onInit;
    renderer.onRender = onRender;
    renderer.onUpdate = onUpdate;

    renderer.run();
}

main();
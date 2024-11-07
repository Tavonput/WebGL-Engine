import { Renderer } from "./renderer.js";
import { ShaderProgram } from "./Core/shaders.js";
import { Mat4 } from "./Math/matrix.js";
import { Mesh } from "./Core/mesh.js";
import { Keys } from "./Core/event.js";
import { Texture } from "./Core/texture.js";

import { vertexShaderSource, fragmentShaderSource } from "./shader_source.js";

// ========================================================================================================================
// Main
//
function main() {
    const canvas = document.getElementById("the-canvas");
    const gl     = canvas.getContext("webgl2");

    let keyboard = Keys.startListening();

    let shaderProgram = new ShaderProgram(gl, vertexShaderSource, fragmentShaderSource);

    let mesh = Mesh.sphere(gl, 16);
    let sphere = mesh.createInstance();
    sphere.scale = Mat4.scale(0.5, 0.5, 0.5); 

    let texture = new Texture(gl, "../Assets/metal_scale.png");

    // ==========
    /** 
     * Ran by the renderer once before rendering starts.
     * 
     * @param {Renderer} renderer  
     */
    function onInit(renderer) {
        shaderProgram.bind(gl);
        shaderProgram.setUniformMat4f(gl, "projection", renderer.camera.projection.data);
        shaderProgram.setUniformMat4f(gl, "view", renderer.camera.getView().data);
        shaderProgram.setUniformInt(gl, "debugMode", Renderer.DEBUG_NONE);

        shaderProgram.setUniformVec3f(gl, "cameraPos",
            renderer.camera.position[0], renderer.camera.position[1], renderer.camera.position[2]
        );

        shaderProgram.setUniformFloat(gl, "matAmbient", 0.25);
        shaderProgram.setUniformFloat(gl, "matDiffuse", 1.0);
        shaderProgram.setUniformFloat(gl, "matSpecular", 2.0);
        shaderProgram.setUniformFloat(gl, "matShininess", 4.0);

        shaderProgram.setUniformVec3f(gl, "lightPos", -1.0, -1.0, -1.0);
        shaderProgram.setUniformVec3f(gl, "lightColor", 1.0, 0.0, 0.0);
        shaderProgram.setUniformFloat(gl, "lightIntensity", 0.5);

        shaderProgram.setUniformVec3f(gl, "sunDir", 1.0, 1.0, 0.0);
        shaderProgram.setUniformVec3f(gl, "sunColor", 1.0, 1.0, 1.0);
    }

    /**
     * Ran by the renderer every render frame.
     * 
     * @param {Renderer} renderer 
     */
    function onRender(renderer) {
        sphere.draw(gl, shaderProgram);
    }
    
    /** 
     * Ran by the renderer every update.
     * 
     * @param {Renderer} renderer 
     */
    function onUpdate(renderer) {
        renderer.updateCamera(keyboard);

        shaderProgram.bind(gl);
        shaderProgram.setUniformVec3f(gl, "cameraPos",
            renderer.camera.position[0], renderer.camera.position[1], renderer.camera.position[2]
        );

        shaderProgram.bind(gl);
        shaderProgram.setUniformMat4f(gl, "view", renderer.camera.getView().data);
    }
    // ==========

    let renderer = new Renderer(gl, canvas.width, canvas.height, onInit, onRender, onUpdate);
    renderer.updatesPerSecond = 60;
    renderer.run();
}

main();
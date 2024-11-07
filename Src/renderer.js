import { Camera } from "./camera.js";
import { Keys } from "./Core/event.js"; 

// ========================================================================================================================
// Renderer
//
// A renderer manages the rendering context. A renderer is provided with three callbacks, onInit, onRender, and onUpdate.
// Each callback is passed a reference to the renderer instance.
export class Renderer {
    /**
     * Debug flags used in the fragment shader.
     */
    static DEBUG_NONE  = 0;
    static DEBUG_WORLD = 1;
    static DEBUG_UV    = 2;
    static DEBUG_Z      = 3;
    static DEBUG_NORMAL = 4;

    /**
     * Create a renderer with callback functions.
     * 
     * @param {WebGL2RenderingContext} gl 
     * @param {number}                 width
     * @param {number}                 height
     * @param {function}               onInit   function(renderer) Once at the start
     * @param {function}               onRender function(renderer) Ran every render update
     * @param {function}               onUpdate function(renderer) Ran every "game" update
     */
    constructor(gl, width, height, onInit, onRender, onUpdate) {
        this.gl = gl;

        this.width  = width;
        this.height = height;

        this.onInit   = onInit;
        this.onRender = onRender;
        this.onUpdate = onUpdate;

        this.camera = new Camera(width / height);

        this.updatesPerSecond = 60;

        this.startTime = performance.now() / 1000;
        this.deltaTimeRender = this.startTime;

        this.previousTimeUpdate = this.startTime;
        this.deltaTimeUpdate    = this.startTime;
    }

    /**
     * Run the renderer.
     */
    run() {
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
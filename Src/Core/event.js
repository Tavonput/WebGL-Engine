import { ShaderProgram } from "./shaders.js";

// ========================================================================================================================
// Keys
//
// A class that tracks keyboard inputs.
export class Keys {

    constructor() {
        this.keysDown = {};
    }

    /**
     * Create a Keys instance that listens for keyboard events.
     *  
     * @returns {Keys}
     */
    static startListening() {
        let keys = new Keys();

        addEventListener("keydown", function(ev) {
            if (typeof ev.code === "string")
                keys.keysDown[ev.code] = true;
        })

        addEventListener("keyup", function(ev) {
            if (typeof ev.code === "string")
                keys.keysDown[ev.code] = false;
        })

        return keys;
    }

    /**
     * Check if a key is down.
     * 
     * @param   {string} code 
     * @returns {boolean}
     */
    isKeyDown(code) {
        return !!this.keysDown[code];
    }

    /**
     * Check if a key is up.
     * 
     * @param   {string} code 
     * @returns {boolean}
     */
    isKeyUp(code) {
        return !this.keysDown[code];
    }

    /**
     * Get all of the current keys down.
     * 
     * @returns {string[]}
     */
    getAllKeysDown() {
        return Object.entries(this.keysDown)
            .filter(kv => kv[1])
            .map(kv => kv[0]);
    }
}

// ========================================================================================================================
// Menu
//
// A class that provides some simple functionality for handling menu items.
export class Menu {

    /**
     * Add a simple shader checkbox.
     * 
     * @param {WebGL2RenderingContext} gl
     * @param {ShaderProgram} shader 
     * @param {string} elementId 
     */
    static addCheckBox(gl, shader, elementId) {
        document.getElementById(elementId).addEventListener("input", (event) => {
            shader.enabled = event.target.checked;
        });
    }

    /**
     * Add a checkbox with a custom callback.
     * 
     * callback(event.target.checked);
     * 
     * @param {string} elementId 
     * @param {function} callback 
     */
    static addCustomCheckBox(elementId, callback) {
        document.getElementById(elementId).addEventListener("input", (event) => {
            callback(event.target.checked);
        });
    }
    
    /**
     * Add a shader float slider.
     * 
     * @param {WebGL2RenderingContext} gl
     * @param {ShaderProgram} shader 
     * @param {string} elementId 
     * @param {string} uniform
     */
    static addFloatSlider(gl, shader, elementId, uniform) {
        document.getElementById(elementId).addEventListener("input", (event) => {
            shader.bind(gl);
            shader.setUniformFloat(gl, uniform, parseFloat(event.target.value));
        });
    }

    /**
     * Add a shader color picker.
     * 
     * @param {WebGL2RenderingContext} gl
     * @param {ShaderProgram} shader 
     * @param {string} elementId 
     * @param {string} uniform
     */
    static addColorPicker(gl, shader, elementId, uniform) {
        document.getElementById(elementId).addEventListener("input", (event) => {
            const hexColor = parseInt(event.target.value.slice(1), 16); // Removes the #
            shader.bind(gl);

            // Hex to RGB float
            shader.setUniformVec3f(
                gl, uniform,
                ((hexColor >> 16) & 255) / 255,
                ((hexColor >> 8) & 255) / 255,
                (hexColor & 255) / 255,
            );
        });
    }

    /**
     * Add a drop down selection. You have to provide the callback.
     * 
     * callback(event.target.value);
     * 
     * @param {string} elementId 
     * @param {function} callback 
     */
    static addDropDown(elementId, callback) {
        document.getElementById(elementId).addEventListener("input", (event) => {
            callback(event.target.value);
        });
    }
}
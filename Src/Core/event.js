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
export class Texture {

    constructor(gl, width = 0, height = 0) {
        this.glTexture = gl.createTexture();

        this.width = width;
        this.height = height;

        this.isReady = false;
        this.image = null;
    }

    /**
     * Create a raw texture object. Pretty much just used for render targets.
     * 
     * @param {WebGL2RenderingContext} gl 
     * @param {number} width 
     * @param {number} height 
     * @param {number} internalFormat 
     * @param {number} format 
     * @param {number} type 
     * 
     * @returns {Texture}
     */
    static createRaw(gl, width, height, internalFormat = gl.RGBA, format = gl.RGBA, type = gl.UNSIGNED_BYTE) {
        let texture = new Texture(gl, width, height);

        gl.bindTexture(gl.TEXTURE_2D, texture.glTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, type, null);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        texture.isReady = true;
        return texture;
    }

    /**
     * Load a texture from a file.
     * 
     * @param {WebGL2RenderingContext} gl 
     * @param {string} filename 
     * 
     * @returns {Texture}
     */
    static createFromFile(gl, filename) {
        let texture = new Texture(gl);

        texture.image = new Image();
        texture.image.src = filename;
        texture.image.onload = () => {
            gl.bindTexture(gl.TEXTURE_2D, texture.glTexture);
            gl.texImage2D(
                gl.TEXTURE_2D, 0, gl.RGBA,
                gl.RGBA, gl.UNSIGNED_BYTE, texture.image
            );

            gl.generateMipmap(gl.TEXTURE_2D);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

            texture.isReady = true;
            texture.image = null;
        }

        return texture;
    }

    /**
     * Bind the texture to a certain active texture slot.
     * 
     * @param {WebGL2RenderingContext} gl 
     * @param {number} slot 
     */
    bind(gl, slot) {
        gl.activeTexture(gl.TEXTURE0 + slot);
        gl.bindTexture(gl.TEXTURE_2D, this.glTexture);
    }
}
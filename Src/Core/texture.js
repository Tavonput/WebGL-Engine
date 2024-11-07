export class Texture {

    constructor(gl, filename) {
        this.glTexture = gl.createTexture();
        this.isReady   = false;

        this.image = new Image();
        this.image.src = filename;
        this.image.onload = () => {
            this._setupTexture(gl);
        };
    }

    /**
     * Image callback for texture creation.
     * 
     * @param {WebGL2RenderingContext} gl 
     */
    _setupTexture(gl) {
        gl.bindTexture(gl.TEXTURE_2D, this.glTexture);
        gl.texImage2D(
            gl.TEXTURE_2D, 0, gl.RGBA,
            gl.RGBA, gl.UNSIGNED_BYTE, this.image
        );

        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        this.isReady = true;
        this.image   = null;
    }
}
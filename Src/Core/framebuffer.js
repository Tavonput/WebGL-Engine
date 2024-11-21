import { Texture } from "./texture.js";

export class FrameBuffer {

    constructor(gl, width, height) {
        this.gl = gl;
        this.width = width;
        this.height = height;

        this.framebuffer = gl.createFramebuffer();
        this.colorAttachments = [];
        this.depthAttachment = null;
    }

    /**
     * Add a color attachment to the framebuffer. Currently only creates them in RGBA.
     * 
     * @returns {Texture} The texture associated with the attachment.
     */
    addColorAttachment() {
        const gl = this.gl;
        const texture = Texture.createRaw(gl, this.width, this.height);

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + this.colorAttachments.length, gl.TEXTURE_2D, texture.glTexture, 0);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

        this.colorAttachments.push(texture);
        return texture;
    }

    /**
     * Add a depth attachment to the framebuffer.
     * 
     * @returns {Texture} The texture associated with the attachment.
     */
    addDepthAttachment() {    
        const gl = this.gl;
        const texture = Texture.createRaw(gl, this.width, this.height, gl.DEPTH_COMPONENT24, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT);

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, texture.glTexture, 0);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

        this.depthAttachment = texture;
        return texture;
    }

    /**
     * Bind the framebuffer and set all of its render targets.
     */
    bind() {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);

        let buffers = [];
        for (let i = 0; i < this.colorAttachments.length; i++)
            buffers.push(this.gl.COLOR_ATTACHMENT0 + i);
        this.gl.drawBuffers(buffers);
    }

    /**
     * Unbind the framebuffer. Sets the currently framebuffer to the default one.
     */
    unbind() {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    }
}

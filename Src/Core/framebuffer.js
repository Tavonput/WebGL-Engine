import { Texture } from "./texture.js";

export class FrameBuffer {

    static COLOR_TYPE_FLOAT = 0;
    static COLOR_TYPE_INT   = 1;

    constructor(gl, width, height) {
        this.gl = gl;
        this.width = width;
        this.height = height;

        this.framebuffer = gl.createFramebuffer();
        this.colorAttachments = [];
        this.depthAttachment = null;

        this.numAttachments = 0;
    }

    /**
     * Copy a color attachment from one buffer to another.
     * 
     * @param {WebGL2RenderingContext} gl 
     * @param {FrameBuffer} srcBuffer 
     * @param {FrameBuffer} dstBuffer 
     * @param {number} attachment 
     */
    static copyColor(gl, srcBuffer, dstBuffer, attachment) {
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, srcBuffer.framebuffer);
        gl.readBuffer(gl.COLOR_ATTACHMENT0 + attachment)

        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, dstBuffer.framebuffer);
        gl.blitFramebuffer(
            0, 0, dstBuffer.width, dstBuffer.height,
            0, 0, dstBuffer.width, dstBuffer.height,
            gl.COLOR_BUFFER_BIT,
            gl.NEAREST
        );

        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    }

    /**
     * Copy the depth attachment from one buffer to another.
     * 
     * @param {WebGL2RenderingContext} gl 
     * @param {FrameBuffer} srcBuffer 
     * @param {FrameBuffer} dstBuffer 
     */
    static copyDepth(gl, srcBuffer, dstBuffer) {
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, srcBuffer.framebuffer);

        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, dstBuffer.framebuffer);
        gl.blitFramebuffer(
            0, 0, srcBuffer.width, srcBuffer.height,
            0, 0, srcBuffer.width, srcBuffer.height,
            gl.DEPTH_BUFFER_BIT,
            gl.NEAREST
        );

        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    }

    /**
     * Add a color attachment to the framebuffer. Currently only creates them in RGBA.
     * 
     * @param {number} colorType
     * 
     * @returns {Texture} The texture associated with the attachment.
     */
    addColorAttachment(colorType) {
        const gl = this.gl;

        let texture = null;
        if (colorType == FrameBuffer.COLOR_TYPE_INT)
            texture = Texture.createRaw(gl, this.width, this.height);
        else if (colorType == FrameBuffer.COLOR_TYPE_FLOAT)
            texture = Texture.createRaw(gl, this.width, this.height, gl.RGBA32F, gl.RGBA, gl.FLOAT);
                
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + this.colorAttachments.length, gl.TEXTURE_2D, texture.glTexture, 0);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

        this.colorAttachments.push(texture);
        this.numAttachments++;

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
        this.numAttachments++;

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

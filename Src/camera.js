import { Mat4 } from "./Math/matrix.js";

// ========================================================================================================================
// Camera
//
export class Camera {
    
    constructor(aspectRatio) {
        this.aspectRatio = aspectRatio;
        this.fov = 0.25;
        this.near = 0.1;
        this.far = 100.0;

        this.projection = null;
        this.updateProjection();
    }

    /**
     * Update the projection matrix with the current camera settings.
     */
    updateProjection() {
        this.projection = Mat4.perspective(this.aspectRatio, this.fov, this.near, this.far);
    }
}
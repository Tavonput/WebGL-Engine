import { Mat4 } from "./Math/matrix.js";

// ========================================================================================================================
// Camera
//
// I assume this will be refactored into the scene graph.
export class Camera {
    constructor(aspectRatio) {
        this.aspectRatio = aspectRatio;
        this.fov         = 0.25;
        this.near        = 0.1;
        this.far         = 100.0;

        this.projection = null;
        this.updateProjection();

        this.position = [0.0, 0.0, -0.5];
        this.roll  = 0.0;
        this.pitch = 0.0;
        this.yaw   = 0.0;
        
        this.translationSpeed = 0.5;
        this.rotationSpeed    = 0.2;
    }

    /**
     * Update the position of the camera.
     * 
     * @param {number} dx 
     * @param {number} dy 
     * @param {number} dz 
     */
    updatePosition(dx, dy, dz) {
        const forwardVector = [
            Math.sin(this.yaw * Math.PI * 2) * Math.cos(this.pitch * Math.PI * 2), 
            Math.sin(this.pitch * Math.PI * 2),                      
            Math.cos(this.yaw * Math.PI * 2) * Math.cos(this.pitch * Math.PI * 2),
        ];

        const rightVector = [
            Math.cos(this.yaw * Math.PI * 2), 
            0,                  
            -Math.sin(this.yaw * Math.PI * 2) 
        ];

        this.position[0] += (dz * forwardVector[0] + dx * rightVector[0]) * this.translationSpeed;
        this.position[1] += dy * this.translationSpeed;
        this.position[2] += (dz * forwardVector[2] + dx * rightVector[2]) * this.translationSpeed;
    }

    /**
     * Update the orientation of the camera.
     * 
     * @param {number} dr 
     * @param {number} dp 
     * @param {number} dy 
     */
    updateOrientation(dr, dp, dy) {
        this.roll  += dr * this.rotationSpeed;
        this.pitch += dp * this.rotationSpeed;
        this.yaw   += dy * this.rotationSpeed;
    }

    /**
     * Get the view matrix with the current camera state.
     * 
     * @returns {Mat4}
     */
    getView() {
        const T = Mat4.translation(this.position[0], this.position[1], this.position[2]);
        const Y = Mat4.rotation_xz(this.yaw);
        const P = Mat4.rotation_yz(this.pitch);
        const R = Mat4.rotation_xy(this.roll);

        return T.mul(Y.mul(P.mul(R))).inverse();
    }

    /**
     * Update the projection matrix with the current camera settings.
     */
    updateProjection() {
        this.projection = Mat4.perspective(this.aspectRatio, this.fov, this.near, this.far);
    }
}
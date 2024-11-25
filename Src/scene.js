import { Vec4 } from "./Math/vector.js"
import { Mat4 } from "./Math/matrix.js";
import { MeshInstance } from "./Core/mesh.js";
import { Camera } from "./camera.js";

import { DirLight, PointLight } from "./Shaders/lighting.js";

// ========================================================================================================================
// Scene Graph Nodes
//
class MeshNode {

    /**
     * Create a mesh scene graph node.
     * 
     * @param {MeshInstance} mesh 
     * @param {Mat4} model 
     */
    constructor(mesh, model) {
        this.mesh = mesh;
        this.model = model;
    }
}

class LightNode {

    /**
     * Create a light scene graph node.
     * 
     * @param {DirLight | PointLight} light 
     */
    constructor(light) {
        this.light = light;
    }
}

class CameraNode {

    /**
     * Create a camera scene graph node.
     * 
     * @param {Camera} camera
     * @param {Mat4} model 
     */
    constructor(camera, model) {
        this.camera = camera;
        this.model = model;
    }

    /**
     * Get the view matrix with the current camera state.
     * 
     * @returns {Mat4}
     */
    getView() {
        return this.model.inverse();
    }

    getProjection() {
        return this.camera.projection;
    }

    /**
     * Get the position of the camera from its model matrix.
     * 
     * @returns {Vec4}
     */
    getPosition() {
        return new Vec4(
            this.model.rc(0, 3), this.model.rc(1, 3), this.model.rc(2, 3)
        );
    }
}

export class Node {
    
    static TYPE_EMPTY         = 0;
    static TYPE_MESH_GEOMETRY = 1;
    static TYPE_MESH_FORWARD  = 2;
    static TYPE_LIGHT         = 3;
    static TYPE_CAMERA        = 4;

    /**
     * Create a scene graph node.
     * 
     * @param {any} data 
     * @param {number} type 
     */
    constructor(data, type = Node.TYPE_EMPTY) {
        this.position = new Vec4(0.0, 0.0, 0.0, 1.0);
        this.scale = new Vec4(1.0, 1.0, 1.0, 1.0);
        this.roll = 0.0;
        this.pitch = 0.0;
        this.yaw = 0.0;

        this.translationSpeed = 0.5;
        this.rotationSpeed = 0.2;

        this.type = type;
        this.data = data;

        /** @type {Node[]} */
        this.children = [];
    }

    /**
     * Add an empty child node.
     * 
     * @param {number} type
     * 
     * @returns {Node}
     */
    addChild(type) {
        let child = new Node(null, type);
        this.children.push(child);
        return child;
    }

    /**
     * Get the model matrix.
     * 
     * @returns {Mat4}
     */
    getModel() {
        let model = new Mat4();
        model = model.mul(Mat4.translation(this.position.x, this.position.y, this.position.z));
        model = model.mul(Mat4.rotation_xz(this.yaw));
        model = model.mul(Mat4.rotation_yz(this.pitch));
        model = model.mul(Mat4.rotation_xy(this.roll));
        model = model.mul(Mat4.scale(this.scale.x, this.scale.y, this.scale.z));
        return model;
    }

    /**
     * Get the type of the node as a string.
     * 
     * @returns {string}
     */
    getTypeString() {
        switch (this.type) {
            case Node.TYPE_MESH_GEOMETRY:
                return "MESH_GEOMETRY";

            case Node.TYPE_MESH_FORWARD:
                return "MESH_FORWARD";
            
            case Node.TYPE_LIGHT:
                return "LIGHT";
            
            case Node.TYPE_CAMERA:
                return "CAMERA";
            
            case Node.TYPE_EMPTY:
                return "EMPTY";
            
            default:
                return "INVALID_NODE_TYPE";
        }
    }

    /**
     * Update the position of the node.
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

        this.position.x += (dz * forwardVector[0] + dx * rightVector[0]) * this.translationSpeed;
        this.position.y += dy * this.translationSpeed;
        this.position.z += (dz * forwardVector[2] + dx * rightVector[2]) * this.translationSpeed;
    }

    /**
     * Update the orientation of the node.
     * 
     * @param {number} dr 
     * @param {number} dp 
     * @param {number} dy 
     */
    updateOrientation(dr, dp, dy) {
        this.roll += dr * this.rotationSpeed;
        this.pitch += dp * this.rotationSpeed;
        this.yaw += dy * this.rotationSpeed;
    }
}

// ========================================================================================================================
// Scene Graph
//
// TODO:
// - Currently the scene graph generates new render jobs ever render frame, even if nothing changes. Realistically we only
//   needs to update nodes whenever they change.
export class SceneGraph {

    constructor() {
        this.root = new Node();

        /** @type {MeshNode[]} */
        this.geometryMeshes = [];

        /** @type {MeshNode[]} */
        this.forwardMeshes = [];

        /** @type {CameraNode[]} */
        this.cameras = [];

        /** @type {LightNode[]} */
        this.lights = [];
    }

    generateRenderJobs() {
        this.geometryMeshes = [];
        this.forwardMeshes = [];
        this.cameras = [];
        this.lights = [];

        this._processNode(Mat4.identity(), this.root);
    }

    /**
     * Update a node given the current state of the keyboard.
     * 
     * @param {Node} node
     * @param {Keys} keyboard 
     * @param {number} deltaTime
     */
    updateNode(node, keyboard, deltaTime) {
        let dx = 0, dy = 0, dz = 0;
        let dr = 0, dp = 0, dyw = 0;

        keyboard.getAllKeysDown().forEach((code) => {
            switch (code) {
                // Orientation
                case "ArrowUp":
                    dp += deltaTime;
                    break;
                case "ArrowDown":
                    dp -= deltaTime;
                    break;
                case "ArrowLeft":
                    dyw -= deltaTime;
                    break;
                case "ArrowRight":
                    dyw += deltaTime;
                    break;
                case "KeyQ":
                    dr -= deltaTime;
                    break;
                case "KeyE":
                    dr += deltaTime;
                    break;

                // Position
                case "KeyW":
                    dz += deltaTime;
                    break;
                case "KeyA":
                    dx -= deltaTime;
                    break;
                case "KeyS":
                    dz -= deltaTime;
                    break;
                case "KeyD":
                    dx += deltaTime;
                    break;
                case "Space":
                    dy += deltaTime;
                    break;
                case "KeyC":
                    dy -= deltaTime;
                    break;
            }
        })

        node.updatePosition(dx, dy, dz);
        node.updateOrientation(dr, dp, dyw);
    }

    /**
     * Generate the render jobs for a node.
     * 
     * @param {Mat4} parentModel 
     * @param {Node} node 
     */
    _processNode(parentModel, node) {
        let model = parentModel.mul(node.getModel());
        
        switch (node.type) {
            case Node.TYPE_MESH_GEOMETRY:
                this.geometryMeshes.push(new MeshNode(node.data, model));
                break;
            
            case Node.TYPE_MESH_FORWARD:
                this.forwardMeshes.push(new MeshNode(node.data, model));
                break;
            
            case Node.TYPE_LIGHT:
                this.lights.push(new LightNode(node.data));
                break;
            
            case Node.TYPE_CAMERA:
                this.cameras.push(new CameraNode(node.data, model));
                break;

            case Node.TYPE_EMPTY:
            default:
                break;
        }

        for (let child of node.children)
            this._processNode(model, child);
    }
}
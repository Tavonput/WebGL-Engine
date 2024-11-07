export class Vec4 {
    constructor(x, y, z, w) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w ?? 0;
    }

    /**
     * Returns the vector that is this vector scaled by the given scalar.
     * 
     * @param {number} by the scalar to scale with 
     * @returns {Vec4}
     */
    scaled(by) {
        return new Vec4(by * this.x, by * this.y, by * this.z, by * this.w);
    }

    /**
     * Returns the dot product between this vector and other
     * 
     * @param {Vec4} other the other vector 
     * 
     * @returns {number}
     */
    dot(other) {
        return this.x * other.x + this.y * other.y + this.z * other.z + this.w * other.w;
    }

    /**
     * Returns the length of this vector
     * 
     * @returns {number}
     */
    length() {
        return Math.sqrt(this.dot(this));
    }

    /**
     * Returns a normalized version of this vector
     * 
     * @returns {Vec4}
     */
    norm() {
        const length = this.length();
        return new Vec4(this.x / length, this.y / length, this.z / length, this.w / length);
    }

    /**
     * Returns the vector sum between this and other.
     * 
     * @param {Vec4} other 
     */
    add(other) {
        return new Vec4(this.x + other.x, this.y + other.y, this.z + other.z, this.w + other.w);
    }

    sub(other) {
        return this.add( other.scaled( -1 ) );
    }

    cross(other) {
        let x = this.y * other.z - this.z * other.y;
        let y = this.x * other.z - this.z * other.x;
        let z = this.x * other.y - this.y * other.x;

        return new Vec4( x, y, z, 0 );
    }
	
    toString() {
		return [ '[', this.x, this.y, this.z, this.w, ']' ].join( ' ' );
	}
}
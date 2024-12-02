export class MirrorShader {

    static vertSource =
    `   #version 300 es 
        precision mediump float;        

        in vec3 coordinates;
        in vec4 color;
	    in vec2 uv;
	    in vec3 normal;


        out vec3 Normal;
        out vec4 Position;

        uniform mat4 model;
        uniform mat4 view;
        uniform mat4 projection;

        void main()
        {
            Normal = mat3(transpose(inverse(model))) * normal;
            Position = model * vec4(coordinates, 1.0);
            gl_Position = projection * view * Position;
        }  
    `;
    
    static fragSource = 
    `   #version 300 es
        precision mediump float;

        out vec4 FragColor;

        in vec3 Normal;
        in vec4 Position;

        uniform vec3 cameraPos;
        uniform samplerCube skybox;

        void main()
        {
            // Calculate the incident vector (from Position to cameraPos)
            vec3 I = normalize(cameraPos - Position.xyz);
            
            // Normalize the normal vector
            vec3 N = normalize(Normal);
            
            // Calculate the reflection vector
            vec3 R = reflect(-I, N);
            
            // Sample the skybox using the reflection vector
            vec3 reflectionColor = texture(skybox, R).rgb;
            
            // Output the reflected color
            FragColor = vec4(reflectionColor, 1.0);
        }
    `;
}

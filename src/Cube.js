class Cube {
    constructor() {
        this.type = 'cube';
        this.color = [1.0, 1.0, 1.0, 1.0]; 
        this.matrix = new Matrix4();
        this.normalMatrix = new Matrix4();
        this.textureNum = -2;
        this.cubeVerts32 = new Float32Array([
            // Front face
            0, 0, 0,  1, 1, 0,  1, 0, 0,
            0, 0, 0,  0, 1, 0,  1, 1, 0,
            // Top face
            0, 1, 0,  0, 1, 1,  1, 1, 1,
            0, 1, 0,  1, 1, 1,  1, 1, 0,
            // Bottom face
            0, 0, 0,  1, 0, 0,  1, 0, 1,
            0, 0, 0,  1, 0, 1,  0, 0, 1,
            // Left face
            0, 0, 0,  0, 1, 0,  0, 1, 1,
            0, 0, 0,  0, 1, 1,  0, 0, 1,
            // Right face
            1, 0, 0,  1, 1, 1,  1, 1, 0,
            1, 0, 0,  1, 0, 1,  1, 1, 1,
            // Back face
            0, 0, 1,  1, 1, 1,  1, 0, 1,
            0, 0, 1,  0, 1, 1,  1, 1, 1
        ]);

        this.cubeUVs32 = new Float32Array([
            // Front face
            0, 0,  1, 1,  1, 0,
            0, 0,  0, 1,  1, 1,
            // Top face
            0, 0,  0, 1,  1, 1,
            0, 0,  1, 1,  1, 0,
            // Bottom face
            0, 0,  1, 0,  1, 1,
            0, 0,  1, 1,  0, 1,
            // Left face
            0, 0,  0, 1,  1, 1,
            0, 0,  1, 1,  1, 0,
            // Right face
            0, 0,  1, 1,  1, 0,
            0, 0,  0, 1,  1, 1,
            // Back face
            0, 0,  1, 1,  1, 0,
            0, 0,  0, 1,  1, 1
        ]);
    }

    renderfaster() {
        var rgba = this.color;

        // Pass the texture number
        gl.uniform1i(u_whichTexture, this.textureNum);
    
        // Pass the color of a point to u_FragColor uniform variable
        gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

        // Pass the matrix to u_ModelMatrix attribute
        gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

        // Initialize buffers if they haven't been created yet
        if (g_vertexBuffer == null || g_uvBuffer == null) {
            initTriangle3DUV();
        }

        // Bind vertex buffer (positions)
        gl.bindBuffer(gl.ARRAY_BUFFER, g_vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.cubeVerts32, gl.STATIC_DRAW);

        // Bind UV buffer (textures)
        gl.bindBuffer(gl.ARRAY_BUFFER, g_uvBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.cubeUVs32, gl.STATIC_DRAW);

        // Draw the cube
        gl.drawArrays(gl.TRIANGLES, 0, 36);
    }
    
    renderfast() {
        var rgba = this.color;
    
        // Pass the texture number
        gl.uniform1i(u_whichTexture, this.textureNum);
    
        // Pass the color of a point to u_FragColor uniform variable
        gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
    
        // Pass the matrix to u_ModelMatrix attribute
        gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
    
        // Combine all vertices and UVs into single arrays
        var allverts = [];
        var alluvs = [];
    
        // Front face
        allverts = allverts.concat([0, 0, 0, 1, 1, 0, 1, 0, 0]);
        alluvs = alluvs.concat([0, 0, 1, 1, 1, 0]);
        allverts = allverts.concat([0, 0, 0, 0, 1, 0, 1, 1, 0]);
        alluvs = alluvs.concat([0, 0, 0, 1, 1, 1]);
    
        // Top face
        allverts = allverts.concat([0, 1, 0, 0, 1, 1, 1, 1, 1]);
        alluvs = alluvs.concat([0, 0, 0, 1, 1, 1]);
        allverts = allverts.concat([0, 1, 0, 1, 1, 1, 1, 1, 0]);
        alluvs = alluvs.concat([0, 0, 1, 1, 1, 0]);
    
        // Bottom face
        allverts = allverts.concat([0, 0, 0, 1, 0, 0, 1, 0, 1]);
        alluvs = alluvs.concat([0, 0, 1, 0, 1, 1]);
        allverts = allverts.concat([0, 0, 0, 1, 0, 1, 0, 0, 1]);
        alluvs = alluvs.concat([0, 0, 1, 1, 0, 1]);
    
        // Left face
        allverts = allverts.concat([0, 0, 0, 0, 1, 0, 0, 1, 1]);
        alluvs = alluvs.concat([0, 0, 0, 1, 1, 1]);
        allverts = allverts.concat([0, 0, 0, 0, 1, 1, 0, 0, 1]);
        alluvs = alluvs.concat([0, 0, 1, 1, 1, 1]);
    
        // Right face
        allverts = allverts.concat([1, 0, 0, 1, 1, 1, 1, 1, 0]);
        alluvs = alluvs.concat([0, 0, 1, 1, 1, 0]);
        allverts = allverts.concat([1, 0, 0, 1, 0, 1, 1, 1, 1]);
        alluvs = alluvs.concat([0, 0, 0, 1, 1, 1]);
    
        // Back face
        allverts = allverts.concat([0, 0, 1, 1, 1, 1, 1, 0, 1]);
        alluvs = alluvs.concat([0, 0, 1, 1, 1, 0]);
        allverts = allverts.concat([0, 0, 1, 0, 1, 1, 1, 1, 1]);
        alluvs = alluvs.concat([0, 0, 0, 1, 1, 1]);
    
        drawTriangle3DUV(allverts, alluvs);
    }

    render() {
        var rgba = this.color;
    
        // Pass the texture number
        gl.uniform1i(u_whichTexture, this.textureNum);
    
        // Pass the color of a point to u_FragColor uniform variable
        gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
    
        // Pass the matrix to u_ModelMatrix attribute
        gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
    
        // Compute and pass the normal matrix
        var normalMatrix = new Matrix4();
        normalMatrix.setInverseOf(this.matrix).transpose();
        gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);

        // Front of cube (reversed winding order)
        drawTriangle3DUVNormal([1,0,0,  1,1,0,  0,0,0], [1,0, 1,1, 0,0], [0,0,-1, 0,0,-1, 0,0,-1]);
        drawTriangle3DUVNormal([1,1,0,  0,1,0,  0,0,0], [1,1, 0,1, 0,0], [0,0,-1, 0,0,-1, 0,0,-1]);
    
        // Pass the color of a point to u_FragColor uniform variable
        //gl.uniform4f(u_FragColor, rgba[0]*.9, rgba[1]*.9, rgba[2]*.9, rgba[3]);
    
        // Top of cube (reversed winding order)
        drawTriangle3DUVNormal([1,1,1,  0,1,1,  0,1,0], [1,1, 0,1, 0,0], [0,1,0, 0,1,0, 0,1,0]);
        drawTriangle3DUVNormal([1,1,0,  1,1,1,  0,1,0], [1,0, 1,1, 0,0], [0,1,0, 0,1,0, 0,1,0]);
    
        // Pass the color of a point to u_FragColor uniform variable
        //gl.uniform4f(u_FragColor, rgba[0]*.8, rgba[1]*.8, rgba[2]*.8, rgba[3]);
    
        // Right of cube (reversed winding order)
        drawTriangle3DUVNormal([1,0,1,  1,1,1,  1,1,0], [1,1, 1,0, 0,0], [1,0,0, 1,0,0, 1,0,0]);
        drawTriangle3DUVNormal([1,0,0,  1,0,1,  1,1,0], [1,0, 1,1, 0,0], [1,0,0, 1,0,0, 1,0,0]);
    
        // Left of cube (reversed winding order)
        //gl.uniform4f(u_FragColor, rgba[0]*.7, rgba[1]*.7, rgba[2]*.7, rgba[3]);
        drawTriangle3DUVNormal([0,0,1,  0,1,1,  0,0,0], [1,1, 0,1, 0,0], [-1,0,0, -1,0,0, -1,0,0]);
        drawTriangle3DUVNormal([0,1,1,  0,1,0,  0,0,0], [1,1, 1,0, 0,0], [-1,0,0, -1,0,0, -1,0,0]);
    
        // Bottom of cube (reversed winding order)
        //gl.uniform4f(u_FragColor, rgba[0]*.6, rgba[1]*.6, rgba[2]*.6, rgba[3]);
        drawTriangle3DUVNormal([0,0,1,  0,1,1,  1,0,1], [0,0, 0,1, 1,1], [0,0,1, 0,0,1, 0,0,1]);
        drawTriangle3DUVNormal([0,1,1,  1,1,1,  1,0,1], [0,1, 1,1, 1,0], [0,0,1, 0,0,1, 0,0,1]);
    
        // Back of cube (reversed winding order)
        //gl.uniform4f(u_FragColor, rgba[0]*.5, rgba[1]*.5, rgba[2]*.5, rgba[3]);
        drawTriangle3DUVNormal([0,0,1,  0,1,1,  1,0,1], [0,0, 0,1, 1,1], [0,0,1, 0,0,1, 0,0,1]);
        drawTriangle3DUVNormal([0,1,1,  1,1,1,  1,0,1], [0,1, 1,1, 1,0], [0,0,1, 0,0,1, 0,0,1]);
    }
    
}

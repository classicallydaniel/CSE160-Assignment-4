// Vertex shader program
var VSHADER_SOURCE = `
    precision mediump float;
    attribute vec4 a_Position;
    attribute vec2 a_UV;
    attribute vec3 a_Normal;
    varying vec2 v_UV;
    varying vec3 v_Normal;
    varying vec4 v_VertPos;
    uniform mat4 u_ModelMatrix; 
    uniform mat4 u_GlobalRotateMatrix;
    uniform mat4 u_ViewMatrix;
    uniform mat4 u_ProjectionMatrix;
    uniform mat4 u_NormalMatrix;

    void main() {
        gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
        v_UV = a_UV;
        v_Normal = normalize(vec3(u_NormalMatrix * vec4(a_Normal,0.0)));
        v_VertPos = u_ModelMatrix * a_Position; // Assign the transformed position to v_VertPos
    }`

// Fragment shader program
var FSHADER_SOURCE = `
    precision mediump float;
    varying vec2 v_UV;
    varying vec3 v_Normal;
    uniform vec4 u_FragColor;
    uniform sampler2D u_Sampler0;
    uniform sampler2D u_Sampler1;
    uniform sampler2D u_Sampler2;
    uniform sampler2D u_Sampler3;
    uniform int u_whichTexture;
    uniform vec3 u_lightPos;
    uniform vec3 u_cameraPos;
    varying vec4 v_VertPos;
    uniform bool u_lightOn;

    void main() {
        if (u_whichTexture == -3) {
            gl_FragColor = vec4((v_Normal+1.0)/2.0, 1.0);   // Use normal
        } else if (u_whichTexture == -2) {
            gl_FragColor = u_FragColor;                     // Use color
        } else if (u_whichTexture == -1) {
            gl_FragColor = vec4(v_UV,1.0,1.0);              // Use UV debug color
        } else if (u_whichTexture == 0) {
            gl_FragColor = texture2D(u_Sampler0, v_UV);     // Use texture0 (dirt block)    
        } else if (u_whichTexture == 1) {
            gl_FragColor = texture2D(u_Sampler1, v_UV);     // Use texture1 (background)
        } else if (u_whichTexture == 2) {
            gl_FragColor = texture2D(u_Sampler2, v_UV);     // Use texture2 (floor)
        } else if (u_whichTexture == 3) {
            gl_FragColor = texture2D(u_Sampler3, v_UV);     // Use texture3 (wall)
        } else {
            gl_FragColor = vec4(1,.2,.2,1);                 // Error, put Redish
        }

        vec3 lightVector = u_lightPos-vec3(v_VertPos);
        float r=length(lightVector);

        // Light Falloff Visualization 1/r^2
        if (u_lightOn) {
            gl_FragColor = vec4(vec3(gl_FragColor) / (r * r), 1); // Only apply falloff if light is on
        }

    
        // N dot L
        vec3 L = normalize(lightVector);
        vec3 N = normalize(v_Normal);
        float nDotL = max(dot(N,L), 0.0);

        // Reflection
        vec3 R = reflect(-L, N);

        // eye
        vec3 E = normalize(u_cameraPos-vec3(v_VertPos));

        // Specular
        float specular = pow(max(dot(E, R), 0.0), 64.0) * 0.8;

        vec3 diffuse = vec3(1.0,1.0,0.9) * vec3(gl_FragColor) * nDotL * 0.7;
        vec3 ambient = vec3(gl_FragColor) * 0.2;
        if (u_lightOn) {
            if (u_whichTexture == 0) {
                gl_FragColor = vec4(specular + diffuse + ambient, 1.0);
            } else {
                gl_FragColor = vec4(diffuse + ambient, 1.0);
            }
        }

    }`

// Global related to UI elements
let g_shapesList = [];
let g_globalAngle = 0;
let g_yellowAngle = 0;
let g_magentaAngle = 0;
let g_yellowAnimation=false;
let g_magentaAnimation=false;

// Global variables for shape properties
let g_selectedType = 'square'; // Default shape type
let g_selectedColor = [1.0, 0.0, 0.0, 1.0]; // Default color (red)
let g_selectedSize = 5.0; // Default size

let a_Position;
let a_UV;
var g_prevMouseX = -1; // Previous mouse X position
var g_mouseSensitivity = 0.05; // Sensitivity factor for mouse movement
var g_accumulatedRotation = 0; // Accumulated rotation angle
let camera = new Camera();

let u_lightPos;
let g_normalOn=false;
let g_normalOff=false;
let g_lightPos=[0,1,-2];
let u_cameraPos;
let g_lightOn = true;

function setupWebGL() {
    // Retrieve <canvas> element
    canvas = document.getElementById('webgl');

    // Get the rendering context for WebGL
    gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return false;
    }
    gl.enable(gl.DEPTH_TEST);

    return true;
}

function connectVariablesToGLSL() {
    // Initialize shaders
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
        console.log('Failed to initialize shaders.');
        return false;
    }

    a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    if (a_Position < 0) {
        console.log('Failed to get the storage location of a_Position');
        return false;
    }

    a_UV = gl.getAttribLocation(gl.program, 'a_UV');
    if (a_UV < 0) {
        console.log('Failed to get the storage location of a_UV');
        return false;
    }

    a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');
    if (a_Normal < 0) {
        console.log('Failed to get the storage location of a_Normal');
        return false;
    }

    u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
    if (!u_FragColor) {
        console.log('Failed to get the storage location of u_FragColor');
        return false;
    }

    u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
    if (!u_ModelMatrix) {
        console.log('Failed to get the storage location of u_ModelMatrix');
        return false;
    }

    u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
    if (!u_GlobalRotateMatrix) {
        console.log('Failed to get the storage location of u_GlobalRotateMatrix');
        return false;
    }

    u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
    if (!u_ViewMatrix) {
        console.log('Failed to get the storage location of u_ViewMatrix');
        return false;
    }

    u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
    if (!u_ProjectionMatrix) {
        console.log('Failed to get the storage location of u_ProjectionMatrix');
        return false;
    }

    u_Sampler0 = gl.getUniformLocation(gl.program, 'u_Sampler0');
    if (!u_Sampler0) {
        console.log('Failed to get the storage location of u_Sampler0');
        return false;
    }

    u_Sampler1 = gl.getUniformLocation(gl.program, 'u_Sampler1');
    if (!u_Sampler1) {
        console.log('Failed to get the storage location of u_Sampler1');
        return false;
    }

    u_Sampler2 = gl.getUniformLocation(gl.program, 'u_Sampler2');
    if (!u_Sampler2) {
        console.log('Failed to get the storage location of u_Sampler2');
        return false;
    }

    u_Sampler3 = gl.getUniformLocation(gl.program, 'u_Sampler3');
    if (!u_Sampler3) {
        console.log('Failed to get the storage location of u_Sampler3');
        return false;
    }

    u_whichTexture = gl.getUniformLocation(gl.program, 'u_whichTexture');
    if (!u_whichTexture) {
        console.log('Failed to get the storage location of u_whichTexture');
        return false;
    }

    u_lightPos = gl.getUniformLocation(gl.program, 'u_lightPos');
    if (!u_lightPos) {
        console.log('Failed to get the storage location of u_lightPos');
        return false;
    }

    u_cameraPos = gl.getUniformLocation(gl.program, 'u_cameraPos');
    if (!u_cameraPos) {
        console.log('Failed to get the storage location of u_cameraPos');
        return false;
    }

    u_lightOn = gl.getUniformLocation(gl.program, 'u_lightOn');
    if (!u_lightOn) {
        console.log('Failed to get the storage location of u_lightOn');
        return false;
    }

    u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
    if (!u_NormalMatrix) {
        console.log('Failed to get the storage location of u_NormalMatrix');
        return false;
    }
    

    // Set an initial value for the model matrix
    var identityM = new Matrix4();
    gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements);

    return true;
}

function addActionsForHtmlUI() {
    // Button Events
    document.getElementById('normalOn').onclick = function() {
        g_normalOn = true;
        renderAllShapes();
    };
    document.getElementById('normalOff').onclick = function() {
        g_normalOn = false;
        renderAllShapes();
    };
    
    // Light On/Off Buttons
    document.getElementById('lightOn').onclick = function() {
        g_lightOn = true;
        renderAllShapes();
    };
    document.getElementById('lightOff').onclick = function() {
        g_lightOn = false;
        renderAllShapes();
    };

    document.getElementById('animationYellowOnButton').onclick = function() {g_yellowAnimation=true;};
    document.getElementById('animationYellowOffButton').onclick = function() {g_yellowAnimation=false;};
    document.getElementById('animationMagentaOnButton').onclick = function() {g_magentaAnimation=true;};
    document.getElementById('animationMagentaOffButton').onclick = function() {g_magentaAnimation=false;};

    // Color Slider Events
    document.getElementById('magentaSlide').addEventListener("mousemove", function() { g_magentaAngle = this.value; renderAllShapes(); });
    document.getElementById('yellowSlide').addEventListener("mousemove", function() { g_yellowAngle = this.value; renderAllShapes(); });
    document.getElementById('lightSlideX').addEventListener("mousemove", function(ev) { if(ev.buttons ==1) {g_lightPos[0] = this.value/100; renderAllShapes();}});
    document.getElementById('lightSlideY').addEventListener("mousemove", function(ev) { if(ev.buttons ==1) {g_lightPos[1] = this.value/100; renderAllShapes();}});
    document.getElementById('lightSlideZ').addEventListener("mousemove", function(ev) { if(ev.buttons ==1) {g_lightPos[2] = this.value/100; renderAllShapes();}});


    // Size Slider Events
    document.getElementById('angleSlide').addEventListener("mousemove", function() { g_globalAngle = this.value; renderAllShapes(); });
}

function initTextures() {
    var image = new Image();    // Create the image object
    if (!image) {
        console.log('Failed to create the image object');
        return false;
    }
    // Load texture 0 (dirt block)
    var image0 = new Image();
    image0.onload = function() { sendImageToTEXTURE(image0, 0); };
    image0.src = 'images/dirt_block.jpg'

    // Load texture 1 (background)
    var image1 = new Image();
    image1.onload = function() { sendImageToTEXTURE(image1, 1); };
    image1.src = 'images/background.jpg';

    // Load texture 2 (floor)
    var image2 = new Image();
    image2.onload = function() { sendImageToTEXTURE(image2, 2); };
    image2.src = 'images/floor.jpg';
    // Load texture 2 (floor)

    var image3 = new Image();
    image3.onload = function() { sendImageToTEXTURE(image3, 3); };
    image3.src = 'images/wall.jpg';

    return true;
}

function sendImageToTEXTURE(image, textureUnit) {
    var texture = gl.createTexture();   // Create a texture object
    if (!texture) {
        console.log('Failed to create the texture object');
        return false;
    }

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);  // Flip the image's y axis
    gl.activeTexture(gl.TEXTURE0 + textureUnit); // Activate the texture unit
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);

    // Set the sampler to the correct texture unit
    if (textureUnit === 0) {
        gl.uniform1i(u_Sampler0, 0); // Bind TEXTURE0 to u_Sampler0
    } else if (textureUnit === 1) {
        gl.uniform1i(u_Sampler1, 1); // Bind TEXTURE1 to u_Sampler1
    } else if (textureUnit === 2) {
        gl.uniform1i(u_Sampler2, 2); // Bind TEXTURE2 to u_Sampler2
    } else if (textureUnit === 3) {
        gl.uniform1i(u_Sampler3, 3); // Bind TEXTURE2 to u_Sampler3
    }

    console.log('Finished loading texture for unit:', textureUnit);
}

function main() {
    // Set up canvas and gl variables
    if (!setupWebGL()) {
        return;
    }

    // Initialize shaders
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
        console.log('Failed to initialize shaders.');
        return;
    }

    // Set up GLSL shader programs and connect GLSL variables
    if (!connectVariablesToGLSL()) {
        return;
    }

    // Set up actions for the HTML UI elements
    addActionsForHtmlUI();

    document.onkeydown = keydown;

    initTextures();

    // Register function (event handler) to be called on mouse movement
    canvas.onmousemove = function(ev) {
        onMove(ev); // Call onMove() whenever the mouse moves
    };

    // Specify the color for clearing <canvas>
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    requestAnimationFrame(tick);
}

var g_startTime=performance.now()/1000.0;
var g_seconds=performance.now()/1000.0-g_startTime;

// Called by browser repeatedly whenever it's time
function tick() {
    // Save the current time
    g_seconds=performance.now()/1000.0-g_startTime;

    updateAnimationAngles();

    renderAllShapes();

    // Tell the browser to update again when it has time
    requestAnimationFrame(tick);
}

// Update the angles of everything if currently animated
function updateAnimationAngles() {
    if (g_yellowAnimation) {
        g_yellowAngle = (45*Math.sin(g_seconds));
    }
    if (g_magentaAnimation) {
        g_magentaAngle = (45*Math.sin(3*g_seconds));
    }

    g_lightPos[0]=Math.cos(g_seconds);   // Move light left and right continuously
}

// Variables to track rotation direction
let rotatingLeft = false;
let rotatingRight = false;
let tiltingUp = false;
let tiltingDown = false;

function onMove(ev) {
    // Get the current mouse position
    let x = ev.clientX;
    let y = ev.clientY;

    // A "dead zone" margin around the center of the canvas
    const deadZone = 70; // Pixels (adjust as needed)
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Check if the mouse is inside the dead zone
    let insideDeadZone = (
        Math.abs(x - centerX) < deadZone &&
        Math.abs(y - centerY) < deadZone
    );

    // If inside the dead zone, stop movement
    if (insideDeadZone) {
        rotatingLeft = false;
        rotatingRight = false;
        tiltingUp = false;
        tiltingDown = false;
        return;
    }

    // Rotation direction
    rotatingLeft = x < centerX - deadZone;
    rotatingRight = x > centerX + deadZone;
    tiltingUp = y < centerY - deadZone;
    tiltingDown = y > centerY + deadZone;
}

// Continuous update function for camera movement
function updateCameraRotation() {
    const rotationSpeed = 1.5; // Degrees per frame

    if (rotatingLeft) {
        camera.panLeft(rotationSpeed);
    } 
    if (rotatingRight) {
        camera.panRight(rotationSpeed);
    }
    if (tiltingUp) {
        camera.tiltUp(-rotationSpeed);
    } 
    if (tiltingDown) {
        camera.tiltUp(rotationSpeed);
    }

    // Update camera vectors
    g_eye = camera.eye.toArray();
    g_at = camera.at.toArray();
    g_up = camera.up.toArray();

    requestAnimationFrame(updateCameraRotation);
}

// Start the continuous camera update loop
updateCameraRotation();

function keydown(ev) {
    if (ev.key === 'w' || ev.key === 'W') {   // Forward
        camera.moveForward();
    } else if (ev.key === 's' || ev.key === 'S') { // Backward
        camera.moveBack();
    } else if (ev.key === 'a' || ev.key === 'A') { // Left
        camera.moveLeft();
    } else if (ev.key === 'd' || ev.key === 'D') { // Right
        camera.moveRight();
    } else if (ev.key === 'q' || ev.key === 'Q') { // Pan left
        camera.panLeft(5); // Rotate by 5 degrees
    } else if (ev.key === 'e' || ev.key === 'E') { // Pan right
        camera.panRight(5); // Rotate by 5 degrees
    }

    // Update global variables with the new camera position and look-at point
    g_eye = camera.eye.toArray();
    g_at = camera.at.toArray();
    g_up = camera.up.toArray();

    // Log the new camera position and look-at point
    console.log("Eye:", g_eye);
    console.log("At:", g_at);
}

function renderAllShapes() {
    // Check the time at the start of this function
    var startTime = performance.now();

    // Pass the projection matrix
    var projMat = new Matrix4();
    projMat.setPerspective(50, 1 * canvas.width / canvas.height, 1, 100);
    gl.uniformMatrix4fv(u_ProjectionMatrix, false, projMat.elements);

    // Pass the view matrix
    var viewMat = new Matrix4();
    viewMat.setLookAt(g_eye[0], g_eye[1], g_eye[2], g_at[0], g_at[1], g_at[2], g_up[0], g_up[1], g_up[2]);    // (eye, at, up)
    gl.uniformMatrix4fv(u_ViewMatrix, false, viewMat.elements);

    // Pass the matrix to u_ModelMatrix attribute
    var globalRotMat = new Matrix4().rotate(g_globalAngle, 0, 1, 0);
    gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMat.elements);

    // Clear both the color and depth buffer before rendering
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.clear(gl.COLOR_BUFFER_BIT );

    // Pass the light position to GLSL
    gl.uniform3f(u_lightPos, g_lightPos[0], g_lightPos[1], g_lightPos[2]);

    // Pass the camera position to GLSL
    gl.uniform3f(u_cameraPos, camera.eye.x, camera.eye.y, camera.eye.z);

    // Pass the light status
    gl.uniform1i(u_lightOn, g_lightOn);

    // Draw the light
    var light = new Cube();
    light.color = [2,2,0,1];
    light.matrix.translate(g_lightPos[0], g_lightPos[1], g_lightPos[2]);
    light.matrix.scale(-.1,-.1,-.1);
    light.matrix.translate(-.5,-.5,-.5);
    light.render();

    // Draw the sky (inverted)
    var sky = new Cube();
    sky.color = [0.8, 0.8, 0.8, 1];
    sky.textureNum = g_normalOn ? -3 : -2; // -3 is normal and -2 is color texture
    sky.matrix.scale(5, 5, 5); // Invert the skybox
    sky.matrix.translate(-.5, -.5, -0.5); // Adjust translation to keep it in place
    sky.render();
    
    // Draw the sphere
    var sphere = new Sphere();
    sphere.color = [1.0, 0.5, 0.0, 1.0];
    sphere.textureNum = g_normalOn ? -3 : -2; // -3 is normal and -2 is color texture
    sphere.matrix.translate(-0.5, -2.49 + 0.5, 0);
    sphere.matrix.scale(0.4, 0.4, 0.4);
    sphere.render();

    // Draw the floor (dirt block texture)
    var floor = new Cube();
    floor.color = [1, 0, 0, 1];
    floor.textureNum = 2; // Use texture 2 (floor)
    floor.matrix.translate(0, -2.49, 0);
    floor.matrix.scale(10, 0, 10);
    floor.matrix.translate(-.5, 0, -0.5);
    floor.render();

    // Draw the body cube
    var body = new Cube();
    body.color = [1, 5, 5, 1];
    body.textureNum = g_normalOn ? -3 : -2; // -3 is normal and -2 is color texture
    body.matrix.translate(-.25, -2.49, -1.5); // Moved down to the floor
    body.matrix.rotate(-5, 1, 0, 0);
    body.matrix.scale(.5, .3, .5);
    body.normalMatrix.setInverseOf(body.matrix).transpose();
    body.render();

    // Yellow arm (adjusted height)
    var yellow = new Cube();
    yellow.color = [1, 1, 0, 1];
    yellow.textureNum = g_normalOn ? -3 : -2; // -3 is normal and -2 is color texture
    yellow.matrix.setTranslate(0, -2.49 + 0.3, -1.503); // Moved down
    yellow.matrix.rotate(-5, 1, 0, 0);
    yellow.matrix.rotate(-g_yellowAngle, 0, 0, 1);
    var yellowCoordinatesMat = new Matrix4(yellow.matrix);
    yellow.matrix.scale(0.25, .7, .5);
    yellow.matrix.translate(-.5, 0, 0);
    yellow.normalMatrix.setInverseOf(yellow.matrix).transpose();
    yellow.render();

    // Magenta box (adjusted height)
    var box = new Cube();
    box.color = [1, 0, 1, 1];
    box.textureNum = g_normalOn ? -3 : -2; // -3 is normal and -2 is color texture
    box.matrix = yellowCoordinatesMat;
    box.matrix.translate(0, 0.65, 0);
    box.matrix.rotate(g_magentaAngle, 0, 0, 1);
    box.matrix.scale(.3, .3, .3);
    box.matrix.translate(-.5, 0, -.001);
    box.normalMatrix.setInverseOf(box.matrix).transpose();
    box.render();

    // Check the time at the end of the function, and show on web page
    var duration = performance.now() - startTime;
    sendTextToHTML(" ms: " + Math.floor(duration) + " fps: " + Math.floor(10000 / duration));
}

function click(ev) {
    // Handle mouse click events
    let [x, y] = convertCoordinatesEventToGL(ev);
    g_shapesList.push({ type: g_selectedType, color: g_selectedColor.slice(), size: g_selectedSize, coords: [x, y] });
    renderAllShapes();
}

function click(ev) {
    // Handle mouse click events
    let [x, y] = convertCoordinatesEventToGL(ev);
    g_shapesList.push({ type: g_selectedType, color: g_selectedColor.slice(), size: g_selectedSize, coords: [x, y] });
    renderAllShapes();
}

function convertCoordinatesEventToGL(ev) {
    let rect = ev.target.getBoundingClientRect();
    let x = ((ev.clientX - rect.left) - canvas.width / 2) / (canvas.width / 2);
    let y = (canvas.height / 2 - (ev.clientY - rect.top)) / (canvas.height / 2);
    return [x, y];
}

function sendTextToHTML(text) {
    document.getElementById("numdot").innerHTML = text;
}
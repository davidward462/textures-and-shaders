
var canvas;
var gl;

var program;

var near = 1;
var far = 100;


var left = -6.0;
var right = 6.0;
var ytop =6.0;
var bottom = -6.0;


var lightPosition2 = vec4(100.0, 100.0, 100.0, 1.0 );
var lightPosition = vec4(0.0, 0.0, 100.0, 1.0 );

var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0 );
var lightDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
var lightSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );

var materialAmbient = vec4( 1.0, 0.0, 1.0, 1.0 );
var materialDiffuse = vec4( 1.0, 0.8, 0.0, 1.0 );
var materialSpecular = vec4( 0.4, 0.4, 0.4, 1.0 );
var materialShininess = 30.0;

var ambientColor, diffuseColor, specularColor;

var modelMatrix, viewMatrix, modelViewMatrix, projectionMatrix, normalMatrix;
var modelViewMatrixLoc, projectionMatrixLoc, normalMatrixLoc;
var eye;
var at = vec3(0.0, 0.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);

var RX = 0;
var RY = 0;
var RZ = 0;

var MS = []; // The modeling matrix stack
var TIME = 0.0; // Realtime
var dt = 0.0
var prevTime = 0.0;
var resetTimerFlag = true;
var animFlag = false;
var controller;

// toggle view angle with button
var viewIndex = 2;
var viewCount = 8;

var useTextures = 1; // indicate whether or not to draw textures at a particular moment

// These are used to store the current state of objects.
// In animation it is often useful to think of an object as having some DOF
// Then the animation is simply evolving those DOF over time.
var currentRotation = [0,0,0];

// Object variables
zeroVector = [0, 0, 0];
noTranslate = zeroVector;
noScale = zeroVector;8
xAxis = [1, 0, 0];
yAxis = [0, 1 ,0];
zAxis = [0, 0, 1];


// Colors
var colorWhite = vec4(1.0, 1.0, 1.0, 1.0);
var colorBlack = vec4(0.0, 0.0, 0.0, 1.0);
var colorRed = vec4(1.0, 0.0, 0.0, 1.0);
var colorGreen = vec4(0.0, 1.0, 0.0, 1.0);
var colorBlue = vec4(0.0, 0.0, 1.0, 1.0);

var colorSkyBlue = vec4(0.5, 0.5, 1.0, 1.0);
var colorGrassGreen = vec4(0.24,0.57,0.25, 1.0);
var colorMidnightBlue = vec4(0.0,0.20,0.40, 1.0);
var colorAlmond = vec4(0.94, 0.87, 0.8);
var colorDarkBrown = vec4(0.4, 0.26, 0.13);
var colorGold = vec4(0.93, 0.91, 0.67);

//making a texture image procedurally
//Let's start with a 1-D array
var texSize = 32;
var imageGrassData = new Array();

// Now for each entry of the array make another array
// 2D array now!
for (var i =0; i<texSize; i++)
	imageGrassData[i] = new Array();

// Now for each entry in the 2D array make a 4 element array (RGBA! for colour)
for (var i =0; i<texSize; i++)
	for ( var j = 0; j < texSize; j++)
		imageGrassData[i][j] = new Float32Array(4);

// Now for each entry in the 2D array let's set the colour.
// We could have just as easily done this in the previous loop actually

// EDITED: to be randomly generated grass texture
for (var i =0; i<texSize; i++) 
	for (var j=0; j<texSize; j++) {
        var h = 8;
        c = Math.random() / h; // random color modifier 
        var color = [0.15+c, 0.5 + c/2, 0.1+c]; // add random modifier to baseline color
		imageGrassData[i][j] = [color[0], color[1], color[2], 1]; // set color on grid
}

//Convert the image to uint8 rather than float.
var imageGrass = new Uint8Array(4*texSize*texSize);

for (var i = 0; i < texSize; i++)
	for (var j = 0; j < texSize; j++)
	   for(var k =0; k<4; k++)
			imageGrass[4*texSize*i+4*j+k] = 255*imageGrassData[i][j][k];
		
// For this example we are going to store a few different textures here
var textureArray = [] ;

// Setting the colour which is needed during illumination of a surface
function setColor(c)
{
    ambientProduct = mult(lightAmbient, c);
    diffuseProduct = mult(lightDiffuse, c);
    specularProduct = mult(lightSpecular, materialSpecular);
    
    gl.uniform4fv( gl.getUniformLocation(program,
                                         "ambientProduct"),flatten(ambientProduct) );
    gl.uniform4fv( gl.getUniformLocation(program,
                                         "diffuseProduct"),flatten(diffuseProduct) );
    gl.uniform4fv( gl.getUniformLocation(program,
                                         "specularProduct"),flatten(specularProduct) );
    gl.uniform4fv( gl.getUniformLocation(program,
                                         "lightPosition"),flatten(lightPosition2) );
    gl.uniform1f( gl.getUniformLocation(program, 
                                        "shininess"),materialShininess );
}

// We are going to asynchronously load actual image files this will check if that call if an async call is complete
// You can use this for debugging
function isLoaded(im) {
    if (im.complete) {
        console.log("loaded") ;
        return true ;
    }
    else {
        console.log("still not loaded!!!!") ;
        return false ;
    }
}

// Helper function to load an actual file as a texture
// NOTE: The image is going to be loaded asyncronously (lazy) which could be
// after the program continues to the next functions. OUCH!
function loadFileTexture(tex, filename)
{
	//create and initalize a webgl texture object.
    tex.textureWebGL  = gl.createTexture();
    tex.image = new Image();
    tex.image.src = filename ;
    tex.isTextureReady = false ;
    tex.image.onload = function() { handleTextureLoaded(tex); }
}

// Once the above image file loaded with loadFileTexture is actually loaded,
// this funcion is the onload handler and will be called.
function handleTextureLoaded(textureObj) {
	//Binds a texture to a target. Target is then used in future calls.
		//Targets:
			// TEXTURE_2D           - A two-dimensional texture.
			// TEXTURE_CUBE_MAP     - A cube-mapped texture.
			// TEXTURE_3D           - A three-dimensional texture.
			// TEXTURE_2D_ARRAY     - A two-dimensional array texture.
    gl.bindTexture(gl.TEXTURE_2D, textureObj.textureWebGL);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); // otherwise the image would be flipped upsdide down
	
	//texImage2D(Target, internalformat, width, height, border, format, type, ImageData source)
    //Internal Format: What type of format is the data in? We are using a vec4 with format [r,g,b,a].
        //Other formats: RGB, LUMINANCE_ALPHA, LUMINANCE, ALPHA
    //Border: Width of image border. Adds padding.
    //Format: Similar to Internal format. But this responds to the texel data, or what kind of data the shader gets.
    //Type: Data type of the texel data
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureObj.image);
	
	//Set texture parameters.
    //texParameteri(GLenum target, GLenum pname, GLint param);
    //pname: Texture parameter to set.
        // TEXTURE_MAG_FILTER : Texture Magnification Filter. What happens when you zoom into the texture
        // TEXTURE_MIN_FILTER : Texture minification filter. What happens when you zoom out of the texture
    //param: What to set it to.
        //For the Mag Filter: gl.LINEAR (default value), gl.NEAREST
        //For the Min Filter: 
            //gl.LINEAR, gl.NEAREST, gl.NEAREST_MIPMAP_NEAREST, gl.LINEAR_MIPMAP_NEAREST, gl.NEAREST_MIPMAP_LINEAR (default value), gl.LINEAR_MIPMAP_LINEAR.
    //Full list at: https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/texParameter
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
	
	//Generates a set of mipmaps for the texture object.
        /*
            Mipmaps are used to create distance with objects. 
        A higher-resolution mipmap is used for objects that are closer, 
        and a lower-resolution mipmap is used for objects that are farther away. 
        It starts with the resolution of the texture image and halves the resolution 
        until a 1x1 dimension texture image is created.
        */
    gl.generateMipmap(gl.TEXTURE_2D);
	
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); //Prevents s-coordinate wrapping (repeating)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); //Prevents t-coordinate wrapping (repeating)
    gl.bindTexture(gl.TEXTURE_2D, null);
    console.log(textureObj.image.src) ;
    
    textureObj.isTextureReady = true ;
}

// Takes an array of textures and calls render if the textures are created/loaded
// This is useful if you have a bunch of textures, to ensure that those files are
// actually laoded from disk you can wait and delay the render function call
// Notice how we call this at the end of init instead of just calling requestAnimFrame like before
function waitForTextures(texs) {
    setTimeout(
		function() {
			   var n = 0 ;
               for ( var i = 0 ; i < texs.length ; i++ )
               {
                    console.log(texs[i].image.src) ;
                    n = n+texs[i].isTextureReady ;
               }
               wtime = (new Date()).getTime() ;
               if( n != texs.length )
               {
               		console.log(wtime + " not ready yet") ;
               		waitForTextures(texs) ;
               }
               else
               {
               		console.log("ready to render") ;
					render(0);
               }
		},
	5) ;
}

// This will use an array of existing image data to load and set parameters for a texture
// We'll use this function for procedural textures, since there is no async loading to deal with
function loadImageTexture(tex, image) {
	//create and initalize a webgl texture object.
    tex.textureWebGL  = gl.createTexture();
    tex.image = new Image();

	//Binds a texture to a target. Target is then used in future calls.
		//Targets:
			// TEXTURE_2D           - A two-dimensional texture.
			// TEXTURE_CUBE_MAP     - A cube-mapped texture.
			// TEXTURE_3D           - A three-dimensional texture.
			// TEXTURE_2D_ARRAY     - A two-dimensional array texture.
    gl.bindTexture(gl.TEXTURE_2D, tex.textureWebGL);

	//texImage2D(Target, internalformat, width, height, border, format, type, ImageData source)
    //Internal Format: What type of format is the data in? We are using a vec4 with format [r,g,b,a].
        //Other formats: RGB, LUMINANCE_ALPHA, LUMINANCE, ALPHA
    //Border: Width of image border. Adds padding.
    //Format: Similar to Internal format. But this responds to the texel data, or what kind of data the shader gets.
    //Type: Data type of the texel data
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize, texSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, image);
	
	//Generates a set of mipmaps for the texture object.
        /*
            Mipmaps are used to create distance with objects. 
        A higher-resolution mipmap is used for objects that are closer, 
        and a lower-resolution mipmap is used for objects that are farther away. 
        It starts with the resolution of the texture image and halves the resolution 
        until a 1x1 dimension texture image is created.
        */
    gl.generateMipmap(gl.TEXTURE_2D);
	
	//Set texture parameters.
    //texParameteri(GLenum target, GLenum pname, GLint param);
    //pname: Texture parameter to set.
        // TEXTURE_MAG_FILTER : Texture Magnification Filter. What happens when you zoom into the texture
        // TEXTURE_MIN_FILTER : Texture minification filter. What happens when you zoom out of the texture
    //param: What to set it to.
        //For the Mag Filter: gl.LINEAR (default value), gl.NEAREST
        //For the Min Filter: 
            //gl.LINEAR, gl.NEAREST, gl.NEAREST_MIPMAP_NEAREST, gl.LINEAR_MIPMAP_NEAREST, gl.NEAREST_MIPMAP_LINEAR (default value), gl.LINEAR_MIPMAP_LINEAR.
    //Full list at: https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/texParameter
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); //Prevents s-coordinate wrapping (repeating)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); //Prevents t-coordinate wrapping (repeating)
    gl.bindTexture(gl.TEXTURE_2D, null);

    tex.isTextureReady = true;
}

// This just calls the appropriate texture loads for this example adn puts the textures in an array
// Store textures
function initTexturesForExample() {
    textureArray.push({}) ;
    loadFileTexture(textureArray[textureArray.length-1],"textures/mushroom-top.png") ;
    
    textureArray.push({}) ;
    loadImageTexture(textureArray[textureArray.length-1],imageGrass) ;
}

window.onload = function init() {

    canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor(0.5, 0.5, 1.0, 1.0);
    
    gl.enable(gl.DEPTH_TEST);

    //
    //  Load shaders and initialize attribute buffers
    //
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    

    setColor(materialDiffuse);
	
	// Initialize some shapes, note that the curved ones are procedural which allows you to parameterize how nice they look
	// Those number will correspond to how many sides are used to "estimate" a curved surface. More = smoother
    Cube.init(program);
    Cylinder.init(20,program);
    Cone.init(20,program);
    Sphere.init(36,program);

    // Matrix uniforms
    modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );
    normalMatrixLoc = gl.getUniformLocation( program, "normalMatrix" );
    projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );
    
    // Lighting Uniforms
    gl.uniform4fv( gl.getUniformLocation(program, 
       "ambientProduct"),flatten(ambientProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, 
       "diffuseProduct"),flatten(diffuseProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, 
       "specularProduct"),flatten(specularProduct) );	
    gl.uniform4fv( gl.getUniformLocation(program, 
       "lightPosition"),flatten(lightPosition) );
    gl.uniform1f( gl.getUniformLocation(program, 
       "shininess"),materialShininess );


    document.getElementById("animToggleButton").onclick = function() {
        if( animFlag ) {
            animFlag = false;
        }
        else {
            animFlag = true  ;
            resetTimerFlag = true ;
            window.requestAnimFrame(render);
        }
    };

    document.getElementById("viewToggleButton").onclick = function () {
        animFlag = false;
        resetTimerFlag = true ;
        viewIndex++;
        viewIndex = viewIndex % viewCount;
    };

    var controller = new CameraController(canvas);
    controller.onchange = function(xRot,yRot) {
        RX = xRot ;
        RY = yRot ;
        window.requestAnimFrame(render); };
	
	
	// Helper function just for this example to load the set of textures
    initTexturesForExample() ;

    waitForTextures(textureArray);
}

// Sets the modelview and normal matrix in the shaders
function setMV() {
    modelViewMatrix = mult(viewMatrix,modelMatrix);
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix) );
    normalMatrix = inverseTranspose(modelViewMatrix);
    gl.uniformMatrix4fv(normalMatrixLoc, false, flatten(normalMatrix) );
}

// Sets the projection, modelview and normal matrix in the shaders
function setAllMatrices() {
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix) );
    setMV();   
}

// Draws a 2x2x2 cube center at the origin
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawCube() {
    setMV();
    Cube.draw();
}

// Draws a sphere centered at the origin of radius 1.0.
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawSphere() {
    setMV();
    Sphere.draw();
}

// Draws a cylinder along z of height 1 centered at the origin
// and radius 0.5.
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawCylinder() {
    setMV();
    Cylinder.draw();
}

// Draws a cone along z of height 1 centered at the origin
// and base radius 1.0.
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawCone() {
    setMV();
    Cone.draw();
}

// Post multiples the modelview matrix with a translation matrix
// and replaces the modeling matrix with the result
function gTranslate(x,y,z) {
    modelMatrix = mult(modelMatrix,translate([x,y,z]));
}

// Post multiples the modelview matrix with a rotation matrix
// and replaces the modeling matrix with the result
function gRotate(theta,x,y,z) {
    modelMatrix = mult(modelMatrix,rotate(theta,[x,y,z]));
}

// Post multiples the modelview matrix with a scaling matrix
// and replaces the modeling matrix with the result
function gScale(sx,sy,sz) {
    modelMatrix = mult(modelMatrix,scale(sx,sy,sz));
}

// Pops MS and stores the result as the current modelMatrix
function gPop() {
    modelMatrix = MS.pop();
}

// pushes the current modelViewMatrix in the stack MS
function gPush() {
    MS.push(modelMatrix);
}

// Functions to create and draw objects
function DrawShape(shape)
{
    // Determine shape
    if(shape=="cone")
    {
        drawCone();
    }
    else if(shape=="sphere")
    {
        drawSphere();
    }
    else if(shape=="cylinder")
    {
        drawCylinder();
    }
    else // base case
    {
        drawCube();
    }
}

// Apply translate, rotate, scale, and color to draw a shape.
function CreateObjectNoStack(shape, translate, rotate, rotateAxis, scale, color)
{
    gTranslate(translate[0], translate[1], translate[2]);
    gRotate(rotate, rotateAxis[0], rotateAxis[1], rotateAxis[2]);
    
    setColor(color);
    gScale(scale[0], scale[1], scale[2]);

    DrawShape(shape);
}

// Apply translate, rotate, scale, and color to draw a shape.
function CreateObjectStack(shape, translate, rotate, rotateAxis, scale, color)
{
    gTranslate(translate[0], translate[1], translate[2]);
    gRotate(rotate, rotateAxis[0], rotateAxis[1], rotateAxis[2]);
    
    gPush();
        setColor(color);
        gScale(scale[0], scale[1], scale[2]);
        DrawShape(shape);
    gPop();
}

// Apply translate, rotate, scale, and color to draw a shape.
function CreateObjectFullStack(shape, translate, rotate, rotateAxis, scale, color)
{
    gPush();
        gTranslate(translate[0], translate[1], translate[2]);
        gRotate(rotate, rotateAxis[0], rotateAxis[1], rotateAxis[2]);

        setColor(color);
        gScale(scale[0], scale[1], scale[2]);
        DrawShape(shape);
    gPop();
}

function SetTextureUse(value)
{
    if (value < 0)
    {
        value  = 0;
    }

    if (value > 1)
    {
        value = 1;
    }

    useTextures = value;
    gl.uniform1i(gl.getUniformLocation(program, "useTextures"), useTextures);
}


/**
* 
// use texture index 0
gl.uniform1i(gl.getUniformLocation(program, "textureIndex"), 0);

// first cube texture
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, textureArray[0].textureWebGL);
gl.uniform1i(gl.getUniformLocation(program, "texture0"), 0);
* 
*/
function MakeTextureActive(textureIndex, textureVariable, activeTexture)
{
    textureArrayIndex = textureIndex; // keep this name different

    gl.uniform1i(gl.getUniformLocation(program, "textureIndex"), textureIndex);

    gl.activeTexture(activeTexture);
    gl.bindTexture(gl.TEXTURE_2D, textureArray[textureArrayIndex].textureWebGL);
	gl.uniform1i(gl.getUniformLocation(program, textureVariable), textureArrayIndex);
}

function CreateMushroom(position, color)
{
    rotation = 90;
    mushroomStalkScale = [0.5, 0.5, 1];
    mushroomCapPos = [0, 0, -0.5];
    mushroomCapScale = [1, 0.4, 1];

    // compensate for mushroom height
    gTranslate(0, 0.7, 0);

    SetTextureUse(0);
    CreateObjectStack("cylinder", position, rotation, xAxis, mushroomStalkScale, colorWhite);
    SetTextureUse(1);
    CreateObjectNoStack("sphere", mushroomCapPos, rotation, xAxis, mushroomCapScale, color);
    SetTextureUse(0);
}

function CreateSmallMushroom(position)
{
    rotation = 90;
    mushroomSmallStalkScale = [0.5, 0.5, 0.5];
    mushroomRoundCapPos = [0, 0, -0.3];
    mushroomRoundCapScaleValue = 0.4;
    mushroomRoundCapScale = [mushroomRoundCapScaleValue, mushroomRoundCapScaleValue, mushroomRoundCapScaleValue];

    // compensate for mushroom height
    gTranslate(0, 0.4, 0);

    CreateObjectStack("cylinder", position, rotation, xAxis, mushroomSmallStalkScale, colorWhite);
    
    CreateObjectNoStack("sphere", mushroomRoundCapPos, rotation, xAxis, mushroomRoundCapScale, colorRed);
}

function CreateLargeMushrooms(mushroomDataList, count)
{
    for(let i = 0; i < count; i++)
    {
        gPush();
            CreateMushroom(mushroomDataList[i], colorWhite);
        gPop();
    }
}

function render(timestamp) {
    
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    center = [0, 0, 0];
    angle = 0;
    radius = 10;
    rotateFactor = 0.02;
    eyeX = center[0] + radius * Math.sin(radians(timestamp*rotateFactor));
    eyeZ = center[2] + radius * Math.cos(radians(timestamp*rotateFactor));

    // eye angle list
    eyeAngleList = [0, 1, 2, 5, 90, -5, -2, -1];

    eye = vec3(eyeX, eyeAngleList[viewIndex], eyeZ);
    //eye = vec3(0, 5, 10);

    MS = []; // Initialize modeling matrix stack
	
	// initialize the modeling matrix to identity
    modelMatrix = mat4();
    
    // set the camera matrix
    viewMatrix = lookAt(eye, at, up);
   
    // set the projection matrix
    projectionMatrix = ortho(left, right, bottom, ytop, near, far);

    // perspective projection
    fovy = 70;
    aspect = 1;
    //projectionMatrix = perspective(fovy, aspect, near, far)

    
    // set all the matrices
    setAllMatrices();
    
	if( animFlag )
    {
		// dt is the change in time or delta time from the last frame to this one
		// in animation typically we have some property or degree of freedom we want to evolve over time
		// For example imagine x is the position of a thing.
		// To get the new position of a thing we do something called integration
		// the simpelst form of this looks like:
		// x_new = x + v*dt
		// That is the new position equals the current position + the rate of of change of that position (often a velocity or speed), times the change in time
		// We can do this with angles or positions, the whole x,y,z position or just one dimension. It is up to us!
		dt = (timestamp - prevTime) / 1000.0;
		prevTime = timestamp;
	}
	
    // time
    timeSeconds = timestamp / 1000.0;

    // Object variables
    var groundPos = [0, -5, 0];
    var groundScale = [6,1,6];

    var ringRadius = 4.5;
    var mushroomWorldHeight = 0.7;

    var mushroomPosList = [
        [ringRadius, mushroomWorldHeight, 0],
        [-ringRadius, mushroomWorldHeight, 0],
        [0, mushroomWorldHeight, ringRadius],
        [0, mushroomWorldHeight, -ringRadius],
        [4, mushroomWorldHeight, 3],
        [-4, mushroomWorldHeight, -3],
        [-3, mushroomWorldHeight, 4],
        [3, mushroomWorldHeight, -4],
        [3, mushroomWorldHeight, -3],
        [3, mushroomWorldHeight, 3]
    ];

    // butterfly
    var bfPos = [-5, 7, 0];
    var bfAngle = -20;
    var bfBodyScale = [0.3, 0.8, 0.3];
    var bfWingScale = [0.5, 0.1, 1];
    var bfLeftWingAngle = [0, 0, 0];
    var bfRightWingAngle = [0, 0, 0];
    var bfWingDistance = 50;
    var bfWingSpeed = 3;
    var bfWingOffset = 0.8;
    var bfHeightFactor = 0.5;
    var bfHeightDivisor = 6;
    var bfLeftEyePos = [0, 0, 0];
    var bfRightEyePos = [0, 0, 0];
    var bfEyeScale = [1, 0.2, 0.2];
    var bfTranslateConst = 1.5;

    // use textures
    SetTextureUse(1);
    MakeTextureActive(1, "texture1", gl.TEXTURE1);
    CreateObjectStack("cube", groundPos, 0, xAxis, [groundScale[0], groundScale[1], groundScale[2]], colorGrassGreen);
    MakeTextureActive(0, "texture0", gl.TEXTURE0);

    SetTextureUse(0);

    //body
    gPush();

        // fluctuate position in the air
        bfPos[1] += bfHeightFactor * Math.cos( radians(timestamp) / bfHeightDivisor);

        // move across screen
        bfPos[0] += timestamp / (bfTranslateConst * 1000.0);

        CreateObjectStack("sphere", bfPos, bfAngle, zAxis, bfBodyScale, colorBlack);

        
        // wings
        gPush();
            gRotate(90, 1, 0, 0);
            bfLeftWingAngle[0] = bfWingDistance*Math.cos( radians(timestamp) / bfWingSpeed);
            gRotate(bfLeftWingAngle[0], 0, 0, 1);
            gRotate(90, 0, 0, 1)
            // translate so joint was where center had been rotating
            gTranslate(bfWingOffset, 0, 0);
            gPush();
            {
                setColor(colorGold);
                gScale(bfWingScale[0], bfWingScale[1], bfWingScale[2]);
                drawCube();
            }
            gPop();
        gPop();

        gPush();
            gRotate(90, 1, 0, 0);
            bfRightWingAngle[0] = bfWingDistance*Math.sin( radians(timestamp) / bfWingSpeed);
            gRotate(bfRightWingAngle[0], 0, 0, 1);
            gRotate(90, 0, 0, 1)
            // translate so joint was where center had been rotating
            gTranslate(-bfWingOffset, 0, 0);
            gPush();
            {
                setColor(colorGold);
                gScale(bfWingScale[0], bfWingScale[1], bfWingScale[2]);
                drawCube();
            }
            gPop();
        gPop();
    gPop();


    // iterate to create mushrooms
    CreateLargeMushrooms(mushroomPosList, 8);


    gPush();
        CreateSmallMushroom(mushroomPosList[8], colorWhite);
    gPop();

    gPush();
        CreateSmallMushroom(mushroomPosList[9], colorWhite);
    gPop();

    // do not use textures
    SetTextureUse(0);


    // begin gnome
    var gnomePos = [0.5, 2, 0.5];
    var gnomeBodyScale = [0.7, 0.7, -0.9];

    var gnomeHeadPos = [0, 0.5, 0];
    var gnomeHeadScale = [0.5, 0.5, 0.5];
    
    var gnomeHatScale = [0.5, 0.5, 1];
    var gnomeHatPos = [0, 0.8, 0];
    
    var gnomeEyeHeight = 0;
    var gnomeLeftEyePos = [0.4, gnomeEyeHeight, 0.2];
    var gnomeRightEyePos = [0.4, gnomeEyeHeight, -0.2];
    var gnomeEyeScale = [0.2, 0.2, 0.2];
    
    var gnomePupilScale = [0.5, 0.5, 0.5];
    var gnomePupilPos = [0.7, 0, 0];
    
    var gnomeLegScale = [0.15, 0.3, 0.15];
    var gnomeLegHeight = -0.7;
    var gnomeLeftLegPos = [-0.3, gnomeLegHeight, 0];
    var gnomeRightLegPos = [0.3, gnomeLegHeight, 0];

    var a = -1;
    var b = 4;
    var c = 2;

    gPush(); // Gnome frame

        // gnome jumps in the form of a parabola
        let x = (timestamp / 1000.0) % 4.0; // loop x value (time)
        let y = a * Math.pow(x - c, 2) + b; // parabola
        gnomePos[1] = y + 2;

        gPush(); // Gnome body
            // Cone as the body needs no initial rotation if it's meant to stand upright.
            CreateObjectStack("cone", gnomePos, 90, xAxis, gnomeBodyScale, colorDarkBrown);

            gRotate(-90, 1, 0, 0);
            gPush(); // Head
                // Adjust head position based on body height and head's own offset
                CreateObjectStack("sphere", gnomeHeadPos, 0, xAxis, gnomeHeadScale, colorAlmond);

                gPush(); // Hat
                    CreateObjectStack("cone", gnomeHatPos, -90, xAxis, gnomeHatScale, colorBlue);
                gPop(); // End hat

                gPush(); // Left Eye
                    CreateObjectNoStack("sphere", gnomeLeftEyePos, 0, xAxis, gnomeEyeScale, colorWhite);

                    gPush(); // Left pupil
                        CreateObjectStack("sphere", gnomePupilPos, 0, xAxis, gnomePupilScale, colorBlack);
                    gPop(); // End pupil 

                gPop(); // End Eye

                gPush(); // Right Eye
                    CreateObjectNoStack("sphere", gnomeRightEyePos, 0, xAxis, gnomeEyeScale, colorWhite);

                    gPush(); // Right pupil
                        CreateObjectStack("sphere", gnomePupilPos, 0, xAxis, gnomePupilScale, colorBlack);
                    gPop(); // End pupil 

                gPop(); // End Eye
                
            gPop(); // End head

            gPush();
                gRotate(90, 0, 1, 0);
                gPush(); // Left leg
                    // Left arm X position is body width plus half arm width to the left
                    CreateObjectStack("cube", gnomeLeftLegPos, 0, xAxis, gnomeLegScale, colorWhite);
                gPop(); // End left arm
                
                gPush(); // Right leg
                    // Right arm X position is body width plus half arm width to the right
                    CreateObjectStack("cube", gnomeRightLegPos, 0, xAxis, gnomeLegScale, colorWhite);
                gPop(); // End right arm
            gPop();


        gPop(); // End body
        
    gPop(); // End gnome frame

    console.log(timeSeconds);
	
    
    if( animFlag )
        window.requestAnimFrame(render);
}

// A simple camera controller which uses an HTML element as the event
// source for constructing a view matrix. Assign an "onchange"
// function to the controller as follows to receive the updated X and
// Y angles for the camera:
//
//   var controller = new CameraController(canvas);
//   controller.onchange = function(xRot, yRot) { ... };
//
// The view matrix is computed elsewhere.
function CameraController(element) {
	var controller = this;
	this.onchange = null;
	this.xRot = 0;
	this.yRot = 0;
	this.scaleFactor = 3.0;
	this.dragging = false;
	this.curX = 0;
	this.curY = 0;
	
	// Assign a mouse down handler to the HTML element.
	element.onmousedown = function(ev) {
		controller.dragging = true;
		controller.curX = ev.clientX;
		controller.curY = ev.clientY;
	};
	
	// Assign a mouse up handler to the HTML element.
	element.onmouseup = function(ev) {
		controller.dragging = false;
	};
	
	// Assign a mouse move handler to the HTML element.
	element.onmousemove = function(ev) {
		if (controller.dragging) {
			// Determine how far we have moved since the last mouse move
			// event.
			var curX = ev.clientX;
			var curY = ev.clientY;
			var deltaX = (controller.curX - curX) / controller.scaleFactor;
			var deltaY = (controller.curY - curY) / controller.scaleFactor;
			controller.curX = curX;
			controller.curY = curY;
			// Update the X and Y rotation angles based on the mouse motion.
			controller.yRot = (controller.yRot + deltaX) % 360;
			controller.xRot = (controller.xRot + deltaY);
			// Clamp the X rotation to prevent the camera from going upside
			// down.
			if (controller.xRot < -90) {
				controller.xRot = -90;
			} else if (controller.xRot > 90) {
				controller.xRot = 90;
			}
			// Send the onchange event to any listener.
			if (controller.onchange != null) {
				controller.onchange(controller.xRot, controller.yRot);
			}
		}
	};
}

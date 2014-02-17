/**
 * The Camera object handles the position, rotation and configuration of the camera
 */
var Camera = function(world) {
	this.world = world;
	this.rotation = quat.create();
	this.moveSpeed = 0.003;
	//this.moveSpeed = 0.15; // TODO only for tests, remove it
	this.position = vec3.fromValues(0, 0, 0); // TODO initial position should be dynamic
	this.lastAnimationTime = 0;
	this.screenSize = null;
	this.projectionMatrix = null;
	this.lastModelViewMatrix = mat4.create();
	this.fovy = 45;
	this.viewDistance = 1000000;
	this.targetBuilding = null;
	this.controls = new Controls(this);
	// TODO customizable fovy and view distance
};

Camera.prototype.updateProjectionMatrix = function(screenWidth, screenHeight) {
	this.screenSize = vec2.fromValues(screenWidth, screenHeight);
	this.projectionMatrix = mat4.create();
	mat4.perspective(this.projectionMatrix, this.fovy, screenWidth / screenHeight, 0.45, this.viewDistance);
	return this.projectionMatrix;
};

Camera.prototype.init = function(canvas) {
	this.controls.init(canvas);
};

// TODO option to freeze z axis (and synchronize camera rotation with spaceship + gravity and walls)

/*Camera.prototype.getPosition = function() {
	return vec3.clone(this.position); // TODO is it useful to clone it ?
};*/

/**
 * Resets the camera if the building which has been removed is the one targetted by the camera.
 * @param Building The removed building
 */
Camera.prototype.notifyBuildingRemoved = function(building) {
	if(building == this.targetBuilding) {
		this.targetBuilding = null;
	}
};

Camera.prototype.getRotation = function() {
	var rotation = quat.clone(this.rotation);
	quat.invert(rotation, rotation);
	
	if(this.world.userSpaceShip != null) {
		var ssRotation = quat.create();
		quat.rotateX(ssRotation, ssRotation, degToRad(this.world.userSpaceShip.rotation[0]));
		quat.rotateY(ssRotation, ssRotation, degToRad(this.world.userSpaceShip.rotation[1]));
		quat.rotateZ(ssRotation, ssRotation, degToRad(this.world.userSpaceShip.rotation[2]));
		quat.multiply(rotation, rotation, ssRotation);
	}
	
	return rotation;
};

/**
 * @return The camera absolute position in the world
 */
Camera.prototype.getAbsolutePosition = function() { // TODO optimize by caching it for each frame
	var pos = vec3.clone(this.position);
	if(this.world.userSpaceShip != null) {
		var ssRotation = quat.create();
		quat.rotateX(ssRotation, ssRotation, degToRad(this.world.userSpaceShip.rotation[0]));
		quat.rotateY(ssRotation, ssRotation, degToRad(this.world.userSpaceShip.rotation[1]));
		quat.rotateZ(ssRotation, ssRotation, degToRad(this.world.userSpaceShip.rotation[2]));
		quat.invert(ssRotation, ssRotation);
		vec3.transformQuat(pos, pos, ssRotation);
		
		vec3.add(pos, pos, this.world.userSpaceShip.getPosition());
	}
	
	return pos;
};

/**
 * Updates the projection, model and view matrix, depending of Controls.
 * @return mat4 The model/view matrix
 */
Camera.prototype.update = function() {
	var userSpaceShip = this.world.userSpaceShip;
	
	// TODO add an inventory button in hud
	if(this.targetBuilding == null && userSpaceShip != null) {
		for(var k in userSpaceShip.entities) {
			if(userSpaceShip.entities[k].type.isControllable) {
				this.targetBuilding = userSpaceShip.entities[k];
				break;
			}
		}
	}
	
	var negatedPosition = vec3.create();
	var invertedRotation = mat4.create();
	
	// TODO only for tests, remove it
	if(this.controls._keys[107]) this.moveSpeed *= 1.05;
	if(this.controls._keys[109]) this.moveSpeed /= 1.05;
	
	// Moves depends of elapsed time
	var timeNow = TimerManager.lastUpdateTimeStamp;
	if(this.lastAnimationTime != 0) {
		var elapsed = timeNow - this.lastAnimationTime;
		
		/**************************************************
		 ********************* Moves **********************
		 **************************************************/
		
		var movement = this.controls.getMovement();
		var currentMove = vec3.create();
		vec3.scale(currentMove, movement, this.moveSpeed * elapsed);
		vec3.transformQuat(currentMove, currentMove, this.rotation);
		vec3.add(this.position, this.position, currentMove);
		
		vec3.negate(negatedPosition, this.position);
		
		/**************************************************
		 ******************** Rotation ********************
		 **************************************************/
		
		var rotationRate = this.controls.getRotation();
		
		var tempQuat = quat.create();
		quat.rotateX(tempQuat, tempQuat, degToRad(rotationRate[0] * elapsed));
		quat.rotateY(tempQuat, tempQuat, degToRad(rotationRate[1] * elapsed));
		quat.rotateZ(tempQuat, tempQuat, degToRad(rotationRate[2] * elapsed));
		quat.normalize(tempQuat, tempQuat);
		quat.multiply(this.rotation, this.rotation, tempQuat);
		
		mat4.fromQuat(invertedRotation, this.rotation);
		mat4.invert(invertedRotation, invertedRotation);
	}
	this.lastAnimationTime = timeNow;
	
	mat4.identity(this.lastModelViewMatrix);
	
	mat4.multiply(this.lastModelViewMatrix, this.lastModelViewMatrix, invertedRotation);
	mat4.translate(this.lastModelViewMatrix, this.lastModelViewMatrix, negatedPosition);
	// TODO camera lagging --> webworker ?
	
	if(userSpaceShip != null) {
		var ssRotation = quat.create();
		quat.rotateX(ssRotation, ssRotation, degToRad(userSpaceShip.rotation[0]));
		quat.rotateY(ssRotation, ssRotation, degToRad(userSpaceShip.rotation[1]));
		quat.rotateZ(ssRotation, ssRotation, degToRad(userSpaceShip.rotation[2]));
		mat4.fromQuat(invertedRotation, ssRotation);
		
		//mat4.translate(this.lastModelViewMatrix, this.lastModelViewMatrix, negatedPosition);
		mat4.multiply(this.lastModelViewMatrix, this.lastModelViewMatrix, invertedRotation);
	}
	
	return this.lastModelViewMatrix;
};

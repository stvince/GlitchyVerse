/**
 * A simple door. See Entity for other parameters.
 * @param {definition} Object Containing the definition of the door, with attributes : 
 *               - unitSize : Array(3) Vector(3), size of each unit (the smallest possible room size)
 *               - edgeSize : The side of the room edges
 */
CustomEntities.Door = function(world, position, rotation, definition, state) {
	this.isAnimationStarted = false;
	
	var model = new Model(world, []);
	model.loadMeshesFromObj("door.obj");
	model.loadMeshesFromObj("door_locks.obj");
	
	var self = this;
	for(var i = 0 ; i < model.meshes.length ; i++) {
		var mesh = model.meshes[i];
		
		if(mesh.groups.indexOf("lock") != -1) {
			world.configurePickableMesh(mesh, function() {
				self.changeState(1 - self.state);
			}, false);
		}
	}
	
	this.modelName = "door.obj";
	model.regenerateCache();
	this.parent(world, model, position, rotation, state);
};
CustomEntities.Door.extend(Entity);

CustomEntities.Door.prototype.changeState = function(newState) {
	if(this.state == null && newState == 0) {
		// First call and door is closed --> nothing to do
		this.state = newState;
	} else if(/*this.animTimer*/this.isAnimationStarted || this.state == newState) {
		// Not changing the state
	} else {
		var self = this;
		this.isAnimationStarted = true;
		var animationToCall = this.state == null || newState > this.state ? "open" : "close";
		this.world.animator.animate(this, animationToCall, function() {
			// TODO in animator, use apply on entity to avoid using "self" variable + do it everywhere possible
			self.isAnimationStarted = false;
		});
		
		if(this.state != null) {
			this.world.server.sendMessage("update_doors", {"id": this.id, "state": newState});
		}
		this.state = newState;
	}
};
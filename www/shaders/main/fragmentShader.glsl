precision mediump float;
precision mediump int;
precision mediump sampler2D;

const int MAX_LIGHTS_NUMBER = 16; // In case of change, it must be edited in LightManager class too
// TODO any way to use GL_MAX_VERTEX_UNIFORM_COMPONENTS to calculate this constant ?

// If these constants are changed, World.js and vertexShader.glsl must be updated too.
const int DRAW_MODE_NORMAL       = 0;
const int DRAW_MODE_PICK_CONTENT = 1;
const int DRAW_MODE_PICK_SCREEN  = 2;

varying vec2 vTextureCoord;
varying float vLighting;
varying vec3 vPickColor;
varying vec3 vRotatedVertexPosition;
varying vec3 vRotatedNormals;
varying vec2 vTextureMapping;

// TODO use a structure for lights to reduce uniform number ?
uniform vec3  uPointLightingPositionArray[MAX_LIGHTS_NUMBER];
uniform vec3  uPointLightingColorArray[MAX_LIGHTS_NUMBER];
uniform float uPointLightingMaxDistanceArray[MAX_LIGHTS_NUMBER];
uniform int   uPointLightingAttenuationArray[MAX_LIGHTS_NUMBER];
uniform float uPointLightingMaxLightningArray[MAX_LIGHTS_NUMBER];
uniform int   uPointLightingArrayLength;
uniform vec4  uColorMask;
uniform vec3  uEntityPickColor;

uniform sampler2D uTexture;
uniform int uDrawMode;
uniform vec3 uCurrentPosition;

uniform float uHasMappedTexture;
uniform sampler2D uMappedTexture;

void main(void) {
	if(uDrawMode == DRAW_MODE_NORMAL) {
		// Lights
		vec3 pointLights = vec3(0.0, 0.0, 0.0);
		for(int i = 0 ; i < MAX_LIGHTS_NUMBER ; i++) {
			if(i < uPointLightingArrayLength) {
				vec3 lightPositionDifference = uPointLightingPositionArray[i] - vRotatedVertexPosition - uCurrentPosition;
				vec3 lightDirection = normalize(lightPositionDifference);
				float lightDistance = abs(length(lightPositionDifference));

				float lightPower;
				if(lightDistance > uPointLightingMaxDistanceArray[i]) {
					lightPower = 0.0;
				} else {
					lightPower = (1.0 - (lightDistance / uPointLightingMaxDistanceArray[i]));
				}
				
				float directionalLightWeighting = max(dot(vRotatedNormals, lightDirection), 0.0);
				pointLights += uPointLightingColorArray[i] * directionalLightWeighting * lightPower;
				
				if(pointLights.x > uPointLightingMaxLightningArray[i]) pointLights.x = uPointLightingMaxLightningArray[i];
				if(pointLights.y > uPointLightingMaxLightningArray[i]) pointLights.y = uPointLightingMaxLightningArray[i];
				if(pointLights.z > uPointLightingMaxLightningArray[i]) pointLights.z = uPointLightingMaxLightningArray[i];
			}
		}
		
		//pointLights.r = clamp(pointLights.r, 0.0, 1.0);
		//pointLights.g = clamp(pointLights.g, 0.0, 1.0);
		//pointLights.b = clamp(pointLights.b, 0.0, 1.0);
		
		vec4 texelColor = texture2D(uTexture, vTextureCoord);
		if(uHasMappedTexture == 1.0) {
			texelColor *= texture2D(uMappedTexture, vTextureMapping);
		}
		if(uColorMask.a > 0.0) {
			texelColor *= uColorMask;
		}
		gl_FragColor = vec4(texelColor.rgb * (vLighting + pointLights), texelColor.a);
	} else if(uDrawMode == DRAW_MODE_PICK_CONTENT) {
		if(uEntityPickColor[0] != 0.0 || uEntityPickColor[1] != 0.0 || uEntityPickColor[2] != 0.0) {
			gl_FragColor = vec4(uEntityPickColor, 1.0); // Pickable entity
		} else {
			gl_FragColor = vec4(vPickColor, 1.0); // Pickable mesh
		}
	} else /*if(uDrawMode == DRAW_MODE_PICK_SCREEN)*/ {
		gl_FragColor = vec4(vPickColor, 1.0);
	}
}

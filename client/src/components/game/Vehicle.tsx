import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import { Vector3, Group } from 'three';
import { socketService } from '@/services/socketService';
import { audioService } from '@/services/audioService';
import { collisionService } from '@/services/collisionService';
import { useGameStore } from '@/store/gameStore';
import { Vector3 as PlayerVector3 } from 'shared/types/player';
import { hasSpawnProtection } from '@/utils/collisionUtils';

// Extend window interface to support the tree data function
declare global {
  interface Window {
    updateNearbyTrees?: (trees: Array<{position: PlayerVector3}>) => void;
  }
}

// Constants for vehicle physics
const BASE_ACCELERATION = 0.008; // Increased base acceleration
const MAX_VELOCITY = 1.0; // Max velocity (200km/h)
const MIN_FRICTION = 0.997; // Even less friction at low speeds (0.3% loss)
const MAX_FRICTION = 0.996; // Less friction at high speeds (0.4% loss)
const BRAKE_POWER = 0.92; // Brake strength (8% reduction per frame)
const BASE_TURN_SPEED = 0.035; // Increased base turning speed for tighter low-speed steering
const MIN_TURN_MULTIPLIER = 0.25; // Minimum turning multiplier at high speeds
const UPDATE_INTERVAL = 50; // How often to send updates (in ms)
const OFF_ROAD_PENALTY = 0.75; // 25% speed penalty when off-road

// Camera view types
enum CameraView {
  REAR = 'rear',   // Default third-person behind the car
  FRONT = 'front', // Third-person in front of car
  FIRST_PERSON = 'first_person' // First-person from driver's perspective
}

export function Vehicle() {
  const vehicleRef = useRef<Group>(null);
  const { camera } = useThree();
  
  // Debug state refs
  const isOnRoadRef = useRef<boolean>(false);
  const terrainMultiplierRef = useRef<number>(1.0);
  const speedRef = useRef<number>(0);
  
  // Get the player state from the game store
  const playerId = useGameStore((state) => state.playerId);
  const playerState = useGameStore((state) => 
    playerId ? state.players[playerId] : null
  );
  const updatePlayer = useGameStore((state) => state.updatePlayer);
  
  // Track velocity
  const velocity = useRef<Vector3>(new Vector3(0, 0, 0));
  const lastUpdateRef = useRef<number>(0);
  
  // Track camera view state
  const cameraViewRef = useRef<CameraView>(CameraView.REAR); // Default to rear view
  const cameraSwitchCooldown = useRef<boolean>(false); // Prevent rapid switching
  
  // Track if engine is running
  const engineRunningRef = useRef<boolean>(false);
  
  // Get keyboard controls and subscribe to camera switch
  const [subscribeKeys, getKeys] = useKeyboardControls();
  
  // We'll handle billboard effect in the main useFrame loop instead to avoid potential conflicts
  
  // Subscribe to camera switch key
  useEffect(() => {
    // Handle camera view switching when 'c' is pressed
    const unsubscribe = subscribeKeys(
      (state) => state.cameraSwitch,
      (pressed) => {
        if (pressed && !cameraSwitchCooldown.current) {
          // Switch camera view and apply cooldown to prevent rapid switching
          cameraSwitchCooldown.current = true;
          
          // Cycle through camera views: REAR -> FRONT -> FIRST_PERSON -> REAR
          switch (cameraViewRef.current) {
            case CameraView.REAR:
              cameraViewRef.current = CameraView.FRONT;
              break;
            case CameraView.FRONT:
              cameraViewRef.current = CameraView.FIRST_PERSON;
              break;
            case CameraView.FIRST_PERSON:
              cameraViewRef.current = CameraView.REAR;
              break;
          }
          
          // Reset cooldown after 300ms to prevent accidental double-switches
          setTimeout(() => {
            cameraSwitchCooldown.current = false;
          }, 300);
        }
      }
    );
    
    return () => {
      unsubscribe();
    };
  }, [subscribeKeys]);
  
  // Setup engine sound management
  useEffect(() => {
    // The engine will only start after user interaction
    // We still call startEngine but it will wait for user interaction internally
    audioService.startEngine();
    engineRunningRef.current = true;
    
    // Stop engine sound when component unmounts
    return () => {
      audioService.stopEngine();
      engineRunningRef.current = false;
    };
  }, []);
  
  // Extract trees from visible chunks for collision detection
  const nearbyTrees = useRef<Array<{position: PlayerVector3}>>([]);
  
  // Reference to track if we need to update tree data
  //const lastPlayerChunk = useRef<{x: number, z: number}>({x: 0, z: 0});
  
  // Move the vehicle based on input
  //useFrame((state, delta) => {
  useFrame(() => {
    if (!vehicleRef.current || !playerState || !playerId) return;
    
    // Get current input state
    const { 
      forward, 
      back, 
      left, 
      right, 
      brake
    } = getKeys();
    
    // Calculate speed (magnitude of velocity)
    const currentSpeed = velocity.current.length();
    speedRef.current = currentSpeed;
    const speedRatio = Math.min(currentSpeed / MAX_VELOCITY, 1); // Value between 0-1
    
    // Calculate variable acceleration based on current speed
    // High acceleration at low speeds with a slower taper
    // This creates a more realistic power curve with more power at medium-high speeds
    const accelerationFactor = 1 - (speedRatio * speedRatio * 0.5); // More gradual taper using quadratic curve
    const currentAcceleration = BASE_ACCELERATION * accelerationFactor;
    
    // Check if vehicle is on a road
    // We need to properly forward the vehicle position to the road check function
    const vehiclePosition = {
      x: vehicleRef.current.position.x,
      z: vehicleRef.current.position.z
    };
    
    // Check if vehicle is on a road
    const isOnRoad = window.isOnRoad ? window.isOnRoad(vehiclePosition) : true;
    
    // Store the value for our debug indicator
    isOnRoadRef.current = isOnRoad;
    
    // Uncomment for debugging:
    // if (Math.random() < 0.01) { // Only show this occasionally to avoid spamming the console
    //   console.log(`Vehicle at (${vehiclePosition.x.toFixed(1)},${vehiclePosition.z.toFixed(1)}) is ${isOnRoad ? 'ON' : 'OFF'} road`);
    // }
    
    // Apply acceleration - corrected direction (forward is positive Z)
    // Apply off-road penalty if not on a road
    const terrainMultiplier = isOnRoad ? 1.0 : OFF_ROAD_PENALTY;
    // Store for debug display
    terrainMultiplierRef.current = terrainMultiplier;
    
    if (forward) {
      velocity.current.z += currentAcceleration * terrainMultiplier;
    } else if (back) {
      velocity.current.z -= currentAcceleration * 0.7 * terrainMultiplier; // Slightly less power in reverse
    }
    
    // Check if vehicle is moving (reuse the already calculated currentSpeed)
    const isMoving = currentSpeed > 0.01; // Threshold to determine if the vehicle is moving
    
    // Get absolute speed value for engine sound (regardless of direction)
    // This makes the engine respond to the car's actual speed rather than just forward motion
    const absoluteSpeed = Math.abs(velocity.current.length());
    
    // Update engine sound based on speed (convert to km/h for audio service)
    // Using our known maximum speed of roughly 200km/h (MAX_VELOCITY * 200)
    const speedKmh = absoluteSpeed * 200; // Convert to km/h to match our new max speed
    
    // Update the engine sound on every frame to ensure it's always on
    // The audioService has performance optimizations to handle frequent calls
    audioService.updateEngineSound(speedKmh);
    
    // Apply turning - only allow turning when the vehicle is moving
    if (isMoving) {
      // Determine if we're going forward or reverse based on the Z velocity
      const isReversing = velocity.current.z < 0;
      const steeringFactor = isReversing ? -1 : 1; // Invert steering direction when reversing
      
      // Calculate enhanced steering with more extreme variation between low and high speeds
      // Much tighter turning at low speeds, and significantly reduced at high speeds
      const speedRatio = currentSpeed / MAX_VELOCITY;
      
      // Exponential curve gives much sharper turning at low speeds
      // This creates a 1.0 to MIN_TURN_MULTIPLIER curve with exponential falloff
      const turnMultiplier = MIN_TURN_MULTIPLIER + (1 - MIN_TURN_MULTIPLIER) * Math.pow(1 - speedRatio, 2);
      
      // Apply the base turn speed with our custom multiplier
      const effectiveTurnSpeed = BASE_TURN_SPEED * turnMultiplier;
      
      // Scale turn amount by speed to prevent the car from rotating when stationary
      const turnAmount = effectiveTurnSpeed * Math.min(0.2 + speedRatio * 0.8, 1.0);
      
      if (left) {
        vehicleRef.current.rotation.y += steeringFactor * turnAmount;
      } else if (right) {
        vehicleRef.current.rotation.y -= steeringFactor * turnAmount;
      }
    }
    
    // Apply braking - stronger than before
    if (brake) {
      velocity.current.multiplyScalar(BRAKE_POWER);
    }
    
    // Limit velocity with terrain penalty
    const maxVelocityWithTerrain = MAX_VELOCITY * (isOnRoad ? 1.0 : OFF_ROAD_PENALTY);
    
    // Limit velocity
    if (velocity.current.length() > maxVelocityWithTerrain) {
      velocity.current.normalize().multiplyScalar(maxVelocityWithTerrain);
    }
    
    // Apply variable friction based on speed and terrain
    // Custom friction curve that allows reaching top speed
    // Start with very little friction, gradually increase with speed, but cap the max friction
    // This uses a custom curve to ensure we can reach max speed
    let frictionFactor;
    
    if (speedRatio < 0.85) {
      // Lower friction at most speeds
      frictionFactor = MIN_FRICTION - (speedRatio * 0.7 * (MIN_FRICTION - MAX_FRICTION));
    } else {
      // Even at top speeds, limit friction to allow maintaining max velocity
      frictionFactor = MAX_FRICTION;
    }
    
    // Apply slightly more friction when off-road
    if (!isOnRoad) {
      // Reduce friction factor by an additional 0.2% when off-road
      frictionFactor *= 0.998;
    }
    
    // Debug: Uncomment to monitor top speed
    // if (speedKmh > 190) console.log(`Speed: ${speedKmh.toFixed(1)} km/h, Friction: ${frictionFactor}`);
    
    velocity.current.multiplyScalar(frictionFactor);
    
    // Apply velocity to vehicle position
    const movement = velocity.current.clone();
    
    // Apply rotation to movement direction
    movement.applyAxisAngle(new Vector3(0, 1, 0), vehicleRef.current.rotation.y);
    
    // Update vehicle position
    vehicleRef.current.position.add(movement);
    
    // Check current chunk to determine when to update tree data
    // const currentPlayerChunk = {
    //   x: Math.floor(vehicleRef.current.position.x / 256),
    //   z: Math.floor(vehicleRef.current.position.z / 256)
    // };
    
    // Check for player-vehicle collisions and get collision response vector
    const vehicleCollisionResponse = collisionService.checkVehicleCollisions(playerId);
    
    // Check for tree collisions and get collision response vector
    const treeCollisionResponse = collisionService.checkTreeCollisions(
      playerId,
      vehicleRef.current.position,
      nearbyTrees.current
    );
    
    // Apply collision response to prevent vehicles from passing through each other
    if (vehicleCollisionResponse) {
      // Update position
      vehicleRef.current.position.add(vehicleCollisionResponse);
      
      // Reduce vehicle speed significantly on collision - lose 80% of speed
      const SPEED_REDUCTION_FACTOR = 0.2; // Keep only 20% of current speed
      velocity.current.multiplyScalar(SPEED_REDUCTION_FACTOR);
      
      // Add a small bounce in the direction of the collision response
      const bounceVector = vehicleCollisionResponse.clone().normalize().multiplyScalar(0.05);
      velocity.current.add(bounceVector);
    }
    
    // Apply tree collision response
    if (treeCollisionResponse) {
      // Update position
      vehicleRef.current.position.add(treeCollisionResponse);
      
      // Trees should stop vehicles almost completely - lose 95% of speed
      const TREE_SPEED_REDUCTION_FACTOR = 0.05; // Keep only 5% of current speed
      velocity.current.multiplyScalar(TREE_SPEED_REDUCTION_FACTOR);
      
      // Add a small bounce in the direction of the collision response
      const bounceVector = treeCollisionResponse.clone().normalize().multiplyScalar(0.03);
      velocity.current.add(bounceVector);
    }
    
    // Update camera position based on the current view mode
    let cameraOffset: Vector3;
    let lookAtPosition: Vector3;
    let lerpSpeed = 0.1; // Default smooth transition speed
    
    // Calculate camera position and target based on the view mode
    switch (cameraViewRef.current) {
      case CameraView.REAR: // Default third-person view from behind
        cameraOffset = new Vector3(0, 5, -10); // Behind and above
        lookAtPosition = vehicleRef.current.position.clone(); // Look at vehicle
        break;
        
      case CameraView.FRONT: // Third-person view from front
        cameraOffset = new Vector3(0, 5, 10); // In front and above
        lookAtPosition = vehicleRef.current.position.clone(); // Look at vehicle
        break;
        
      case CameraView.FIRST_PERSON: // First-person driver view
        // Position at driver's eye level, slightly offset from center
        cameraOffset = new Vector3(0.5, 2.2, 0); // Right side (driver position), eye level
        lerpSpeed = 0.2; // Faster transition for first-person
        
        // Look in the direction the car is facing (10 units ahead)
        const forwardDir = new Vector3(0, 1.8, 10); // Look ahead and slightly down
        
        // Apply car's rotation to both offset and look-direction
        cameraOffset.applyAxisAngle(new Vector3(0, 1, 0), vehicleRef.current.rotation.y);
        forwardDir.applyAxisAngle(new Vector3(0, 1, 0), vehicleRef.current.rotation.y);
        
        lookAtPosition = vehicleRef.current.position.clone().add(forwardDir);
        break;
    }
    
    // Apply the car's rotation to camera offset (except for first-person which already did this)
    if (cameraViewRef.current !== CameraView.FIRST_PERSON) {
      cameraOffset.applyAxisAngle(new Vector3(0, 1, 0), vehicleRef.current.rotation.y);
    }
    
    // Apply the calculated offset to the vehicle position
    const targetPosition = new Vector3(
      vehicleRef.current.position.x + cameraOffset.x,
      vehicleRef.current.position.y + cameraOffset.y,
      vehicleRef.current.position.z + cameraOffset.z
    );
    
    // Smoothly transition camera to target position
    camera.position.lerp(targetPosition, lerpSpeed);
    
    // Point camera at the appropriate position
    camera.lookAt(lookAtPosition);
    
    // Send position updates to server
    const now = Date.now();
    if (now - lastUpdateRef.current > UPDATE_INTERVAL) {
      lastUpdateRef.current = now;
      
      // Create player update data
      const playerUpdate = {
        position: {
          x: vehicleRef.current.position.x,
          y: vehicleRef.current.position.y,
          z: vehicleRef.current.position.z,
        },
        rotation: {
          x: vehicleRef.current.rotation.x,
          y: vehicleRef.current.rotation.y,
          z: vehicleRef.current.rotation.z,
        },
        velocity: {
          x: velocity.current.x,
          y: velocity.current.y,
          z: velocity.current.z,
        },
      };
      
      // Update local state
      if (playerId) {
        updatePlayer(playerId, playerUpdate);
      }
      
      // Send update to server
      socketService.sendPlayerUpdate(playerUpdate);
    }
  });
  
  // Set initial position from server
  useEffect(() => {
    if (vehicleRef.current && playerState) {
      vehicleRef.current.position.set(
        playerState.position.x,
        playerState.position.y,
        playerState.position.z
      );
      
      vehicleRef.current.rotation.set(
        playerState.rotation.x,
        playerState.rotation.y,
        playerState.rotation.z
      );
      
      velocity.current.set(
        playerState.velocity.x,
        playerState.velocity.y,
        playerState.velocity.z
      );
    }
  }, [playerState]);
  
  // This effect registers a global function to update nearby trees for collision detection
  useEffect(() => {
    // Register a global function to update tree data
    window.updateNearbyTrees = (trees: Array<{position: PlayerVector3}>) => {
      nearbyTrees.current = trees;
    };
    
    return () => {
      // Clean up when component unmounts
      delete window.updateNearbyTrees;
    };
  }, []);
  
  // Check if player has spawn protection
  const hasProtection = playerState && hasSpawnProtection(playerState);
  
  // Use refs instead of state for shield effects to avoid potential render issues
  const shieldOpacity = useRef(0.2);
  const shieldScale = useRef(1.0);
  
  // Add pulse effect to shield when spawn protection is active
  useEffect(() => {
    if (!hasProtection) return;
    
    const pulseInterval = setInterval(() => {
      shieldOpacity.current = 0.1 + Math.sin(Date.now() * 0.005) * 0.1;
      shieldScale.current = 1.0 + Math.sin(Date.now() * 0.003) * 0.1;
    }, 50);
    
    return () => clearInterval(pulseInterval);
  }, [hasProtection]);
  
  // Create HTML overlay for road status debug indicator
  useEffect(() => {
    // Create road status indicator
    const indicator = document.createElement('div');
    indicator.id = 'road-status-indicator';
    indicator.style.position = 'fixed';
    indicator.style.top = '10px';
    indicator.style.left = '10px';
    indicator.style.padding = '10px';
    indicator.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    indicator.style.color = 'white';
    indicator.style.fontFamily = 'monospace';
    indicator.style.fontSize = '16px';
    indicator.style.borderRadius = '5px';
    indicator.style.zIndex = '1000';
    document.body.appendChild(indicator);
    
    // Update the indicator every frame
    const updateIndicator = () => {
      if (indicator) {
        // Get vehicle position for display
        let positionText = 'Unknown';
        let roadStatus = 'Unknown';
        
        if (vehicleRef.current) {
          const pos = vehicleRef.current.position;
          positionText = `X: ${pos.x.toFixed(1)}, Z: ${pos.z.toFixed(1)}`;
          roadStatus = isOnRoadRef.current ? 'ON ROAD' : 'OFF ROAD';
        }
        
        // Check if the road detection function is available
        const isRoadDetectionAvailable = window.isOnRoad !== undefined;
        
        // Calculate speed in km/h for display
        const speedKmh = speedRef.current * 200;
        
        // Create detailed road information
        let roadDetailsHtml = '';
        if (window.nearbyRoads && window.nearbyRoads.length > 0) {
          // Get the current position for distance calculations
          const posX = vehicleRef.current?.position?.x ?? 0;
          const posZ = vehicleRef.current?.position?.z ?? 0;
          
          // Add a header for the road details section
          roadDetailsHtml = `<div style="margin-top: 10px; border-top: 1px solid #555; padding-top: 5px;">
            <div><strong>Detailed Road Information:</strong></div>`;
          
          // Loop through nearby roads and add their details
          window.nearbyRoads.forEach((road, index) => {
            // Calculate the distance from vehicle to road center
            const roadCenterX = (road.x1 + road.x2) / 2;
            const roadCenterZ = (road.z1 + road.z2) / 2;
            const distance = Math.sqrt(
              Math.pow(posX - roadCenterX, 2) + 
              Math.pow(posZ - roadCenterZ, 2)
            );
            
            // Determine road orientation
            const isHorizontal = Math.abs(road.x2 - road.x1) > Math.abs(road.z2 - road.z1);
            const isVertical = Math.abs(road.z2 - road.z1) > Math.abs(road.x2 - road.x1);
            const isDiagonal = !isHorizontal && !isVertical;
            
            // Calculate the bounds of the road
            const roadLeft = Math.min(road.x1, road.x2);
            const roadRight = Math.max(road.x1, road.x2);
            const roadTop = Math.min(road.z1, road.z2);
            const roadBottom = Math.max(road.z1, road.z2);
            
            // Calculate distance to road (for debug)
            let specialDistanceInfo = '';
            
            // For horizontal roads
            if (isHorizontal) {
              const roadZ = (road.z1 + road.z2) / 2;
              const isInXRange = posX >= roadLeft && posX <= roadRight;
              const distanceToZ = Math.abs(posZ - roadZ);
              specialDistanceInfo = `
                <div>X-Range: ${isInXRange ? 'Inside' : 'Outside'} (${roadLeft.toFixed(1)}-${roadRight.toFixed(1)})</div>
                <div>Z Distance: ${distanceToZ.toFixed(1)} (Width/2=${(road.width/2).toFixed(1)})</div>
              `;
            }
            // For vertical roads
            else if (isVertical) {
              const roadX = (road.x1 + road.x2) / 2;
              const isInZRange = posZ >= roadTop && posZ <= roadBottom;
              const distanceToX = Math.abs(posX - roadX);
              specialDistanceInfo = `
                <div>Z-Range: ${isInZRange ? 'Inside' : 'Outside'} (${roadTop.toFixed(1)}-${roadBottom.toFixed(1)})</div>
                <div>X Distance: ${distanceToX.toFixed(1)} (Width/2=${(road.width/2).toFixed(1)})</div>
              `;
            }
            // For diagonal roads
            else if (isDiagonal) {
              // Calculate line equation Ax + By + C = 0
              const A = road.z2 - road.z1;
              const B = road.x1 - road.x2;
              const C = road.x2 * road.z1 - road.x1 * road.z2;
              
              // Calculate perpendicular distance
              const perpDistance = Math.abs(A * posX + B * posZ + C) / Math.sqrt(A * A + B * B);
              
              // Check if position is within the bounding box
              const isInBoundingBox = posX >= roadLeft - road.width/2 && 
                                     posX <= roadRight + road.width/2 &&
                                     posZ >= roadTop - road.width/2 && 
                                     posZ <= roadBottom + road.width/2;
              
              specialDistanceInfo = `
                <div>Bounding Box: ${isInBoundingBox ? 'Inside' : 'Outside'}</div>
                <div>Perp Distance: ${perpDistance.toFixed(1)} (Width/2=${(road.width/2).toFixed(1)})</div>
              `;
            }
            
            // Add this road's information to the HTML
            roadDetailsHtml += `
              <div style="margin-top: 5px; border: 1px solid #333; padding: 3px; font-size: 12px;">
                <div>Road #${index + 1} - Type: ${isHorizontal ? 'Horizontal' : isVertical ? 'Vertical' : 'Diagonal'}</div>
                <div>Coords: (${road.x1.toFixed(1)},${road.z1.toFixed(1)}) to (${road.x2.toFixed(1)},${road.z2.toFixed(1)})</div>
                <div>Width: ${road.width.toFixed(1)}, Distance: ${distance.toFixed(1)}</div>
                ${specialDistanceInfo}
              </div>
            `;
          });
          
          // Close the road details section
          roadDetailsHtml += `</div>`;
        }
        
        // Set the indicator HTML with the enhanced information
        indicator.innerHTML = `
          <div>Position: ${positionText}</div>
          <div>Status: <span style="color: ${isOnRoadRef.current ? 'lime' : 'red'}">${roadStatus}</span></div>
          <div>Speed: ${speedKmh.toFixed(1)} km/h</div>
          <div>Speed Multiplier: ${terrainMultiplierRef.current.toFixed(2)}x</div>
          <div>Speed Penalty: ${isOnRoadRef.current ? 'None' : '25%'}</div>
          <div>Road Detection: <span style="color: ${isRoadDetectionAvailable ? 'lime' : 'red'}">${isRoadDetectionAvailable ? 'AVAILABLE' : 'NOT AVAILABLE'}</span></div>
          <div>Road Count: ${window.nearbyRoads ? window.nearbyRoads.length : 'Unknown'}</div>
          ${roadDetailsHtml}
        `;
        
        // Adjust the container style for the expanded content
        indicator.style.maxHeight = '80vh';
        indicator.style.overflowY = 'auto';
        
        // Add a button to manually test the road detection at the current position
        if (!indicator.querySelector('#test-road-btn')) {
          const testDiv = document.createElement('div');
          testDiv.style.marginTop = '10px';
          testDiv.style.paddingTop = '5px';
          testDiv.style.borderTop = '1px solid #555';
          
          // Test button for current position
          const testButton = document.createElement('button');
          testButton.id = 'test-road-btn';
          testButton.textContent = 'Test Current Position';
          testButton.style.padding = '5px';
          testButton.style.marginRight = '5px';
          testButton.onclick = () => {
            if (window.isOnRoad && vehicleRef.current) {
              const pos = vehicleRef.current.position;
              const result = window.isOnRoad({x: pos.x, z: pos.z});
              
              // Create a new element with the result
              const resultDiv = document.createElement('div');
              resultDiv.style.marginTop = '5px';
              resultDiv.innerHTML = `
                <div>Manual Test Result for position (${pos.x.toFixed(1)}, ${pos.z.toFixed(1)}):</div>
                <div style="color: ${result ? 'lime' : 'red'}">${result ? 'ON ROAD' : 'OFF ROAD'}</div>
              `;
              
              // Add or replace the result
              const existingResult = indicator.querySelector('#test-result');
              if (existingResult) {
                existingResult.replaceWith(resultDiv);
              } else {
                resultDiv.id = 'test-result';
                testDiv.appendChild(resultDiv);
              }
            }
          };
          
          // Add input fields for custom coordinates testing
          const coordsForm = document.createElement('div');
          coordsForm.style.marginTop = '10px';
          
          // X coordinate input
          const xInput = document.createElement('input');
          xInput.id = 'test-x-coord';
          xInput.type = 'text';
          xInput.placeholder = 'X coordinate';
          xInput.style.width = '100px';
          xInput.style.marginRight = '5px';
          xInput.value = vehicleRef.current ? vehicleRef.current.position.x.toFixed(1) : '0';
          
          // Z coordinate input
          const zInput = document.createElement('input');
          zInput.id = 'test-z-coord';
          zInput.type = 'text';
          zInput.placeholder = 'Z coordinate';
          zInput.style.width = '100px';
          zInput.style.marginRight = '5px';
          zInput.value = vehicleRef.current ? vehicleRef.current.position.z.toFixed(1) : '0';
          
          // Test custom coordinates button
          const testCustomBtn = document.createElement('button');
          testCustomBtn.textContent = 'Test Custom Coords';
          testCustomBtn.style.padding = '5px';
          testCustomBtn.onclick = () => {
            if (window.isOnRoad) {
              const x = parseFloat(xInput.value);
              const z = parseFloat(zInput.value);
              
              if (!isNaN(x) && !isNaN(z)) {
                const result = window.isOnRoad({x, z});
                
                // Create a new element with the result
                const resultDiv = document.createElement('div');
                resultDiv.style.marginTop = '5px';
                resultDiv.innerHTML = `
                  <div>Custom Test Result for position (${x.toFixed(1)}, ${z.toFixed(1)}):</div>
                  <div style="color: ${result ? 'lime' : 'red'}">${result ? 'ON ROAD' : 'OFF ROAD'}</div>
                `;
                
                // Add or replace the result
                const existingResult = indicator.querySelector('#custom-test-result');
                if (existingResult) {
                  existingResult.replaceWith(resultDiv);
                } else {
                  resultDiv.id = 'custom-test-result';
                  coordsForm.appendChild(resultDiv);
                }
              }
            }
          };
          
          // Add all elements to the form
          coordsForm.appendChild(xInput);
          coordsForm.appendChild(zInput);
          coordsForm.appendChild(testCustomBtn);
          
          testDiv.appendChild(testButton);
          testDiv.appendChild(coordsForm);
          indicator.appendChild(testDiv);
        }
      }
      
      requestAnimationFrame(updateIndicator);
    };
    
    updateIndicator();
    
    // Clean up
    return () => {
      if (indicator && indicator.parentNode) {
        indicator.parentNode.removeChild(indicator);
      }
    };
  }, []);
  
  return (
    <group ref={vehicleRef}>
      {/* Spawn protection shield - simplified for now */}
      {hasProtection && (
        <mesh position={[0, 1, 0]}>
          <sphereGeometry args={[2.5, 16, 16]} />
          <meshStandardMaterial 
            transparent={true} 
            opacity={0.3} 
            color="#00bfff" 
            emissive="#00bfff"
            emissiveIntensity={0.5}
          />
        </mesh>
      )}
      
      {/* Main car body */}
      <mesh castShadow receiveShadow position={[0, 0.6, 0]}>
        <boxGeometry args={[2, 1, 4]} />
        <meshStandardMaterial color={playerState?.color || 'red'} />
      </mesh>
      
      {/* Car top */}
      <mesh castShadow position={[0, 1.3, -0.5]}>
        <boxGeometry args={[1.5, 0.6, 2]} />
        <meshStandardMaterial color={playerState?.color || 'red'} />
      </mesh>
      
      {/* Wheels */}
      <Wheel position={[1, 0, 1]} />
      <Wheel position={[-1, 0, 1]} />
      <Wheel position={[1, 0, -1]} />
      <Wheel position={[-1, 0, -1]} />
      
      {/* Headlights */}
      <mesh position={[0.6, 0.6, 2]} scale={[0.3, 0.3, 0.1]}>
        <boxGeometry />
        <meshStandardMaterial color="#ffffff" emissive="#ffffcc" emissiveIntensity={1} />
      </mesh>
      <mesh position={[-0.6, 0.6, 2]} scale={[0.3, 0.3, 0.1]}>
        <boxGeometry />
        <meshStandardMaterial color="#ffffff" emissive="#ffffcc" emissiveIntensity={1} />
      </mesh>
      
      {/* Taillights */}
      <mesh position={[0.6, 0.6, -2]} scale={[0.3, 0.3, 0.1]}>
        <boxGeometry />
        <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[-0.6, 0.6, -2]} scale={[0.3, 0.3, 0.1]}>
        <boxGeometry />
        <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
}

function Wheel({ position }: { position: [number, number, number] }) {
  return (
    <mesh castShadow position={position}>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial color="black" />
    </mesh>
  );
}

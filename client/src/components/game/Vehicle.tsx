import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3, Group } from 'three';
import { socketService } from '@/services/socketService';
import { audioService } from '@/services/audioService';
import { collisionService } from '@/services/collisionService';
import { useGameStore } from '@/store/gameStore';
import { Vector3 as PlayerVector3 } from 'shared/types/player';
import { hasSpawnProtection } from '@/utils/collisionUtils';
import { useDesktopControls, useMobileControls, defaultControlsState } from './Controls';

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

// Type for Vehicle props to differentiate between mobile and desktop
type VehicleProps = {
  controlType: 'mobile' | 'desktop';
};

export function Vehicle({ controlType }: VehicleProps) {
  const vehicleRef = useRef<Group>(null);
  const { camera } = useThree();
  
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
  
  // Use the appropriate controls based on control type
  // These hooks are safe because they're not conditionally called - 
  // the controlType is fixed at component creation time
  const mobileControls = controlType === 'mobile' ? useMobileControls() : { getControls: () => defaultControlsState };
  const desktopControls = controlType === 'desktop' ? useDesktopControls() : { getControls: () => defaultControlsState };
  
  // Get the appropriate control getter function
  const getControls = controlType === 'mobile' ? mobileControls.getControls : desktopControls.getControls;
  
  // Handle camera switch for desktop devices
  useEffect(() => {
    if (controlType !== 'desktop') return; // Skip for mobile devices

    // Use keyboard events directly for desktop camera switch
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if the 'c' key was pressed
      if (e.code === 'KeyC' && !cameraSwitchCooldown.current) {
        switchCameraView();
      }
    };
    
    // Add event listener for keyboard events
    window.addEventListener('keydown', handleKeyDown);
    
    // Clean up
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [controlType]);
  
  // Helper function to switch camera view
  const switchCameraView = () => {
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
  };
  
  // Handle camera switch for mobile controls (separate from frame loop for better performance)
  useEffect(() => {
    if (controlType !== 'mobile') return; // Skip for desktop devices
    
    // Check if the current frame has a camera switch request
    const checkCameraSwitch = () => {
      const { cameraSwitch } = getControls();
      
      if (cameraSwitch && !cameraSwitchCooldown.current) {
        switchCameraView();
      }
    };
    
    // Set up a frame check for camera switch requests
    const intervalId = setInterval(checkCameraSwitch, 100);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [controlType, getControls]);
  
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
  
  // Reusable vectors to avoid memory allocations
  const _tempVec3 = new Vector3();
  const _tempVec3_2 = new Vector3();
  const _tempVec3_3 = new Vector3();
  const _cameraOffset = new Vector3();
  const _lookAtPosition = new Vector3();
  const _forwardDir = new Vector3();
  const _movement = new Vector3();
  const _targetPosition = new Vector3();
  
  // Move the vehicle based on input
  useFrame(() => {
    if (!vehicleRef.current || !playerState || !playerId) return;
    
    // Periodically clean up collision records to prevent memory leaks
    // Only run this check every ~3 seconds (180 frames at 60fps)
    if (Math.random() < 0.0055) {
      collisionService.cleanupCollisionRecords();
    }
    
    // Get current input state (from keyboard or joystick)
    const { 
      forward, 
      back, 
      left, 
      right, 
      brake
    } = getControls();
    
    // Calculate speed (magnitude of velocity)
    const currentSpeed = velocity.current.length();
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
    
    // Apply acceleration - corrected direction (forward is positive Z)
    // Apply off-road penalty if not on a road
    const terrainMultiplier = isOnRoad ? 1.0 : OFF_ROAD_PENALTY;
    
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
    
    velocity.current.multiplyScalar(frictionFactor);
    
    // Apply velocity to vehicle position - use reusable vector instead of creating new one
    _movement.copy(velocity.current);
    
    // Apply rotation to movement direction
    _movement.applyAxisAngle(new Vector3(0, 1, 0), vehicleRef.current.rotation.y);
    
    // Update vehicle position
    vehicleRef.current.position.add(_movement);
    
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
      
      // Add a small bounce in the direction of the collision response - reuse vector
      _tempVec3.copy(vehicleCollisionResponse).normalize().multiplyScalar(0.05);
      velocity.current.add(_tempVec3);
    }
    
    // Apply tree collision response
    if (treeCollisionResponse) {
      // Update position
      vehicleRef.current.position.add(treeCollisionResponse);
      
      // Trees should stop vehicles almost completely - lose 95% of speed
      const TREE_SPEED_REDUCTION_FACTOR = 0.05; // Keep only 5% of current speed
      velocity.current.multiplyScalar(TREE_SPEED_REDUCTION_FACTOR);
      
      // Add a small bounce in the direction of the collision response - reuse vector
      _tempVec3.copy(treeCollisionResponse).normalize().multiplyScalar(0.03);
      velocity.current.add(_tempVec3);
    }
    
    // Update camera position based on the current view mode
    let lerpSpeed = 0.1; // Default smooth transition speed
    
    // Calculate camera position and target based on the view mode - reuse vectors
    switch (cameraViewRef.current) {
      case CameraView.REAR: // Default third-person view from behind
        _cameraOffset.set(0, 5, -10); // Behind and above
        // Set lookAtPosition to vehicle position
        _lookAtPosition.copy(vehicleRef.current.position);
        break;
        
      case CameraView.FRONT: // Third-person view from front
        _cameraOffset.set(0, 5, 10); // In front and above
        // Set lookAtPosition to vehicle position
        _lookAtPosition.copy(vehicleRef.current.position);
        break;
        
      case CameraView.FIRST_PERSON: // First-person driver view
        // Position at driver's eye level, slightly offset from center
        _cameraOffset.set(0.5, 2.2, 0); // Right side (driver position), eye level
        lerpSpeed = 0.2; // Faster transition for first-person
        
        // Look in the direction the car is facing (10 units ahead)
        _forwardDir.set(0, 1.8, 10); // Look ahead and slightly down
        
        // Apply car's rotation to both offset and look-direction
        _cameraOffset.applyAxisAngle(_tempVec3_3.set(0, 1, 0), vehicleRef.current.rotation.y);
        _forwardDir.applyAxisAngle(_tempVec3_3.set(0, 1, 0), vehicleRef.current.rotation.y);
        
        // Set lookAtPosition
        _lookAtPosition.copy(vehicleRef.current.position).add(_forwardDir);
        break;
    }
    
    // Apply the car's rotation to camera offset (except for first-person which already did this)
    if (cameraViewRef.current !== CameraView.FIRST_PERSON) {
      _cameraOffset.applyAxisAngle(_tempVec3_2.set(0, 1, 0), vehicleRef.current.rotation.y);
    }
    
    // Apply the calculated offset to the vehicle position
    _targetPosition.set(
      vehicleRef.current.position.x + _cameraOffset.x,
      vehicleRef.current.position.y + _cameraOffset.y,
      vehicleRef.current.position.z + _cameraOffset.z
    );
    
    // Smoothly transition camera to target position
    camera.position.lerp(_targetPosition, lerpSpeed);
    
    // Point camera at the appropriate position
    camera.lookAt(_lookAtPosition);
    
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

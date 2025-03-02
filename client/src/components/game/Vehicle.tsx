import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import { Vector3, Group, Box3 } from 'three';
import { socketService } from '@/services/socketService';
import { useGameStore } from '@/store/gameStore';
import { Controls } from './Game';
import { Vector3 as PlayerVector3 } from 'shared/types/player';

// Constants for vehicle physics
const ACCELERATION = 0.01;
const MAX_VELOCITY = 0.5;
const FRICTION = 0.98;
const TURN_SPEED = 0.02;
const UPDATE_INTERVAL = 50; // How often to send updates (in ms)

export function Vehicle() {
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
  
  // Get keyboard controls
  const [subscribeKeys, getKeys] = useKeyboardControls();
  
  // Move the vehicle based on input
  useFrame((state, delta) => {
    if (!vehicleRef.current || !playerState) return;
    
    // Get current input state
    const { 
      forward, 
      back, 
      left, 
      right, 
      brake
    } = getKeys();
    
    // Apply acceleration - corrected direction (forward is positive Z)
    if (forward) {
      velocity.current.z += ACCELERATION;
    } else if (back) {
      velocity.current.z -= ACCELERATION;
    }
    
    // Calculate speed (magnitude of velocity)
    const currentSpeed = velocity.current.length();
    const isMoving = currentSpeed > 0.01; // Threshold to determine if the vehicle is moving
    
    // Apply turning - only allow turning when the vehicle is moving
    if (isMoving) {
      // Determine if we're going forward or reverse based on the Z velocity
      const isReversing = velocity.current.z < 0;
      const steeringFactor = isReversing ? -1 : 1; // Invert steering direction when reversing
      
      // Calculate enhanced steering at low speeds (tighter turning radius)
      // This formula provides increased steering capability at low speeds while
      // maintaining normal steering at higher speeds
      const speedRatio = currentSpeed / MAX_VELOCITY;
      const steeringMultiplier = 0.4 + (0.6 * speedRatio); // Range from 0.4 to 1.0
      const enhancedSteering = TURN_SPEED * (1 / steeringMultiplier);
      
      if (left) {
        vehicleRef.current.rotation.y += steeringFactor * enhancedSteering * speedRatio;
      } else if (right) {
        vehicleRef.current.rotation.y -= steeringFactor * enhancedSteering * speedRatio;
      }
    }
    
    // Apply braking
    if (brake) {
      velocity.current.multiplyScalar(0.9);
    }
    
    // Limit velocity
    if (velocity.current.length() > MAX_VELOCITY) {
      velocity.current.normalize().multiplyScalar(MAX_VELOCITY);
    }
    
    // Apply friction
    velocity.current.multiplyScalar(FRICTION);
    
    // Apply velocity to vehicle position
    const movement = velocity.current.clone();
    
    // Apply rotation to movement direction
    movement.applyAxisAngle(new Vector3(0, 1, 0), vehicleRef.current.rotation.y);
    
    // Update vehicle position
    vehicleRef.current.position.add(movement);
    
    // Update camera position - position camera behind the vehicle
    const cameraOffset = new Vector3(0, 5, -10); // Position camera behind the vehicle
    cameraOffset.applyAxisAngle(new Vector3(0, 1, 0), vehicleRef.current.rotation.y);
    camera.position.lerp(
      new Vector3(
        vehicleRef.current.position.x + cameraOffset.x,
        vehicleRef.current.position.y + cameraOffset.y,
        vehicleRef.current.position.z + cameraOffset.z
      ),
      0.1
    );
    
    // Point camera at vehicle
    camera.lookAt(vehicleRef.current.position);
    
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
  
  return (
    <group ref={vehicleRef}>
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

import { Canvas } from '@react-three/fiber';
import { KeyboardControls, Sky, Stats } from '@react-three/drei';
import * as THREE from 'three';
import { Suspense, useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { WorldRenderer } from './WorldRenderer';
import { Vehicle } from './Vehicle';
import { OtherPlayers } from './OtherPlayers';
import { LoadingPlaceholder } from '../ui/LoadingPlaceholder';
import { DesktopControls, MobileControls } from './Controls';
import { useGameStore } from '@/store/gameStore';
import { isMobileDevice } from '@/utils/deviceDetection';

// Define keyboard controls for the game
export enum GameControls {
  forward = 'forward',
  back = 'back',
  left = 'left',
  right = 'right',
  jump = 'jump',
  brake = 'brake',
  cameraSwitch = 'cameraSwitch',
}

// Keyboard mapping
const keyboardMap = [
  { name: GameControls.forward, keys: ['ArrowUp', 'KeyW'] },
  { name: GameControls.back, keys: ['ArrowDown', 'KeyS'] },
  { name: GameControls.left, keys: ['ArrowLeft', 'KeyA'] },
  { name: GameControls.right, keys: ['ArrowRight', 'KeyD'] },
  { name: GameControls.jump, keys: ['Space'] },
  { name: GameControls.brake, keys: ['ShiftLeft', 'ShiftRight'] },
  { name: GameControls.cameraSwitch, keys: ['KeyC'] }, // Press 'c' to switch camera view
];

// Component to make the environment follow the player
function EnvironmentFollower() {
  const playerId = useGameStore((state) => state.playerId);
  const player = useGameStore((state) => playerId ? state.players[playerId] : null);
  
  // Reference to environment elements
  // Using any for ref types to avoid drei type conflicts
  const skyRef = useRef<any>(null);
  const directionalLightRef = useRef<THREE.Object3D | null>(null);
  
  // Update environment position to follow the player
  useFrame(() => {
    if (player && player.position) {
      // If we have a sky component reference, update its position
      if (skyRef.current) {
        skyRef.current.position.x = player.position.x;
        skyRef.current.position.z = player.position.z;
      }
      
      // Update directional light position relative to player
      if (directionalLightRef.current) {
        directionalLightRef.current.position.x = player.position.x + 10;
        directionalLightRef.current.position.z = player.position.z + 5;
      }
    }
  });
  
  return (
    <group>
      {/* Sky that follows the player */}
      <Sky ref={skyRef} sunPosition={[100, 10, 100]} distance={450000} />
      
      {/* Directional light that follows the player */}
      <directionalLight
        ref={directionalLightRef}
        position={[10, 10, 5]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
    </group>
  );
}

// Common game elements that don't rely on control scheme
function CommonGameElements() {
  return (
    <>
      <Stats />
      <Suspense fallback={<LoadingPlaceholder />}>
        {/* Environment elements that follow the player */}
        <EnvironmentFollower />
        
        {/* Ambient light for the scene */}
        <ambientLight intensity={0.8} />
        
        {/* World renderer component */}
        <WorldRenderer />
        
        {/* Other players */}
        <OtherPlayers />
      </Suspense>
    </>
  );
}

// Desktop-specific vehicle implementation
function DesktopVehicle() {
  return (
    <Suspense fallback={<LoadingPlaceholder />}>
      <Vehicle controlType="desktop" />
      <DesktopControls />
    </Suspense>
  );
}

// Mobile-specific vehicle implementation
function MobileVehicle() {
  return (
    <Suspense fallback={<LoadingPlaceholder />}>
      <Vehicle controlType="mobile" />
    </Suspense>
  );
}

export function Game() {
  const [isMobile, setIsMobile] = useState(false);
  
  // Check if device is mobile
  useEffect(() => {
    setIsMobile(isMobileDevice());
  }, []);

  // Conditionally render desktop or mobile version
  if (!isMobile) {
    // Desktop version with KeyboardControls wrapper
    return (
      <KeyboardControls map={keyboardMap}>
        <Canvas
          shadows
          camera={{ position: [0, 5, 10], fov: 60 }}
          style={{ width: '100%', height: '100%' }}
        >
          <CommonGameElements />
          <DesktopVehicle />
        </Canvas>
      </KeyboardControls>
    );
  }
  
  // Mobile version without KeyboardControls wrapper
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas
        shadows
        camera={{ position: [0, 5, 10], fov: 60 }}
        style={{ width: '100%', height: '100%' }}
      >
        <CommonGameElements />
        <MobileVehicle />
      </Canvas>
      
      {/* Render UI controls outside the Canvas but above it */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, pointerEvents: 'none' }}>
        <MobileControls />
      </div>
    </div>
  );
}

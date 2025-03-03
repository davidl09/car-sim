import { Canvas } from '@react-three/fiber';
import { KeyboardControls, Sky, Stats, Environment } from '@react-three/drei';
import { Suspense, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { WorldRenderer } from './WorldRenderer';
import { Vehicle } from './Vehicle';
import { OtherPlayers } from './OtherPlayers';
import { LoadingPlaceholder } from '../ui/LoadingPlaceholder';
import { Controls } from './Controls';
import { useGameStore } from '@/store/gameStore';

// Define keyboard controls for the game
export enum Controls {
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
  { name: Controls.forward, keys: ['ArrowUp', 'KeyW'] },
  { name: Controls.back, keys: ['ArrowDown', 'KeyS'] },
  { name: Controls.left, keys: ['ArrowLeft', 'KeyA'] },
  { name: Controls.right, keys: ['ArrowRight', 'KeyD'] },
  { name: Controls.jump, keys: ['Space'] },
  { name: Controls.brake, keys: ['ShiftLeft', 'ShiftRight'] },
  { name: Controls.cameraSwitch, keys: ['KeyC'] }, // Press 'c' to switch camera view
];

// Component to make the environment follow the player
function EnvironmentFollower() {
  const playerId = useGameStore((state) => state.playerId);
  const player = useGameStore((state) => playerId ? state.players[playerId] : null);
  const { scene } = useThree();
  
  // Reference to environment elements
  const skyRef = useRef(null);
  const directionalLightRef = useRef(null);
  
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

export function Game() {
  return (
    <KeyboardControls map={keyboardMap}>
      <Canvas
        shadows
        camera={{ position: [0, 5, 10], fov: 60 }}
        style={{ width: '100%', height: '100%' }}
      >
        <Stats />
        <Suspense fallback={<LoadingPlaceholder />}>
          {/* Environment elements that follow the player */}
          <EnvironmentFollower />
          
          {/* Ambient light for the scene */}
          <ambientLight intensity={0.8} />
          
          {/* World renderer component */}
          <WorldRenderer />
          
          {/* Player's vehicle */}
          <Vehicle />
          
          {/* Other players */}
          <OtherPlayers />
        </Suspense>
      </Canvas>
    </KeyboardControls>
  );
}

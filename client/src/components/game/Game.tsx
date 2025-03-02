import { Canvas } from '@react-three/fiber';
import { KeyboardControls, Sky, Stats } from '@react-three/drei';
import { Suspense } from 'react';
import { WorldRenderer } from './WorldRenderer';
import { Vehicle } from './Vehicle';
import { OtherPlayers } from './OtherPlayers';
import { LoadingPlaceholder } from '../ui/LoadingPlaceholder';
import { Controls } from './Controls';

// Define keyboard controls for the game
export enum Controls {
  forward = 'forward',
  back = 'back',
  left = 'left',
  right = 'right',
  jump = 'jump',
  brake = 'brake',
}

// Keyboard mapping
const keyboardMap = [
  { name: Controls.forward, keys: ['ArrowUp', 'KeyW'] },
  { name: Controls.back, keys: ['ArrowDown', 'KeyS'] },
  { name: Controls.left, keys: ['ArrowLeft', 'KeyA'] },
  { name: Controls.right, keys: ['ArrowRight', 'KeyD'] },
  { name: Controls.jump, keys: ['Space'] },
  { name: Controls.brake, keys: ['ShiftLeft', 'ShiftRight'] },
];

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
          {/* Sky with a slightly cartoon-like appearance */}
          <Sky sunPosition={[100, 10, 100]} />
          
          {/* Ambient light for the scene */}
          <ambientLight intensity={0.8} />
          
          {/* Directional light to cast shadows */}
          <directionalLight
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

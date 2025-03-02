import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { useGameStore } from '@/store/gameStore';
import { Vector3, Group } from 'three';
import { Player } from 'shared/types/player';

export function OtherPlayers() {
  const playerId = useGameStore((state) => state.playerId);
  const players = useGameStore((state) => state.players);
  
  // Filter out the current player
  const otherPlayers = useMemo(() => {
    if (!playerId) return [];
    
    return Object.values(players).filter(
      (player) => player.id !== playerId
    );
  }, [players, playerId]);
  
  return (
    <group>
      {otherPlayers.map((player) => (
        <OtherVehicle key={player.id} player={player} />
      ))}
    </group>
  );
}

interface OtherVehicleProps {
  player: Player;
}

function OtherVehicle({ player }: OtherVehicleProps) {
  const vehicleRef = useRef<Group>(null);
  const targetPosition = useRef<Vector3>(new Vector3(0, 0, 0));
  const targetRotation = useRef<Vector3>(new Vector3(0, 0, 0));
  const nameTagRef = useRef<Group>(null);
  
  // Update target position and rotation when player data changes
  useEffect(() => {
    targetPosition.current.set(
      player.position.x,
      player.position.y,
      player.position.z
    );
    
    targetRotation.current.set(
      player.rotation.x,
      player.rotation.y,
      player.rotation.z
    );
  }, [player]);
  
  // Smoothly interpolate to the target position and rotation
  useFrame(({ camera }) => {
    if (!vehicleRef.current) return;
    
    // Interpolate position
    vehicleRef.current.position.lerp(targetPosition.current, 0.1);
    
    // Interpolate rotation (simple lerp for each axis)
    vehicleRef.current.rotation.x += (targetRotation.current.x - vehicleRef.current.rotation.x) * 0.1;
    vehicleRef.current.rotation.y += (targetRotation.current.y - vehicleRef.current.rotation.y) * 0.1;
    vehicleRef.current.rotation.z += (targetRotation.current.z - vehicleRef.current.rotation.z) * 0.1;
    
    // Make player name tag face the camera
    if (nameTagRef.current) {
      nameTagRef.current.lookAt(camera.position);
    }
  });
  
  return (
    <group ref={vehicleRef}>
      {/* Main car body */}
      <mesh castShadow receiveShadow position={[0, 0.6, 0]}>
        <boxGeometry args={[2, 1, 4]} />
        <meshStandardMaterial color={player.color} />
      </mesh>
      
      {/* Car top */}
      <mesh castShadow position={[0, 1.3, -0.5]}>
        <boxGeometry args={[1.5, 0.6, 2]} />
        <meshStandardMaterial color={player.color} />
      </mesh>
      
      {/* Wheels */}
      <Wheel position={[1, 0, 1]} />
      <Wheel position={[-1, 0, 1]} />
      <Wheel position={[1, 0, -1]} />
      <Wheel position={[-1, 0, -1]} />
      
      {/* Player Name Tag */}
      <group ref={nameTagRef} position={[0, 2.2, 0]}>
        <Text
          color="white"
          fontSize={0.4}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.04}
          outlineColor="#000"
        >
          {player.name || `Player ${player.id.substring(0, 4)}`}
        </Text>
      </group>
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



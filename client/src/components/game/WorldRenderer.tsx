import { useMemo, useEffect } from 'react';
//import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';
import { Building, Road, Tree } from 'shared/types/world';
import { Vector3 as PlayerVector3 } from 'shared/types/player';

// Constants for world generation
const CHUNK_SIZE = 256;
const VISIBLE_CHUNKS = 3; // Number of chunks visible in each direction

export function WorldRenderer() {
  //const { camera } = useThree();
  const worldSeed = useGameStore((state) => state.worldSeed);
  const playerId = useGameStore((state) => state.playerId);
  const playerPosition = useGameStore((state) => 
    playerId ? state.players[playerId]?.position : null
  );

  // Track loaded chunks
  //const loadedChunks = useRef<Record<string, boolean>>({});
  
  // Generate pseudo-random number using seed
  const seededRandom = (x: number, z: number) => {
    if (!worldSeed) return Math.random();
    
    const dot = x * 12345 + z * 67890;
    const seed = worldSeed * 16807 + dot;
    return (seed % 2147483647) / 2147483647;
  };
  
  // Get the current chunk coordinates based on player position
  const currentChunk = useMemo(() => {
    if (!playerPosition) return { x: 0, z: 0 };
    
    return {
      x: Math.floor(playerPosition.x / CHUNK_SIZE),
      z: Math.floor(playerPosition.z / CHUNK_SIZE)
    };
  }, [playerPosition]);
  
  // Determine which chunks should be visible
  const visibleChunkCoords = useMemo(() => {
    const coords = [];
    
    for (let x = -VISIBLE_CHUNKS; x <= VISIBLE_CHUNKS; x++) {
      for (let z = -VISIBLE_CHUNKS; z <= VISIBLE_CHUNKS; z++) {
        coords.push({
          x: currentChunk.x + x,
          z: currentChunk.z + z,
          key: `${currentChunk.x + x},${currentChunk.z + z}`
        });
      }
    }
    
    return coords;
  }, [currentChunk]);
  
  return (
    <group>
      {/* Ground plane */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.1, 0]}
        receiveShadow
      >
        <planeGeometry args={[10000, 10000]} />
        <meshStandardMaterial color="#8BC34A" />
      </mesh>
      
      {/* Render all visible chunks */}
      {visibleChunkCoords.map(({ x, z, key }) => (
        <Chunk key={key} x={x} z={z} seededRandom={seededRandom} />
      ))}
    </group>
  );
}

interface ChunkProps {
  x: number;
  z: number;
  seededRandom: (x: number, z: number) => number;
}

function Chunk({ x, z, seededRandom }: ChunkProps) {
  // Determine if this chunk is a city, suburb, or countryside
  // Use a different pattern to create more varied terrain
  // 1 in 4 chunks are cities, 1 in 4 are suburbs, and 2 in 4 are countryside
  const terrainRandom = seededRandom(x * 5000, z * 5000);
  const terrainType = terrainRandom < 0.25 ? 'city' : terrainRandom < 0.5 ? 'suburb' : 'country';
  const isCity = terrainType === 'city';
  const isSuburb = terrainType === 'suburb';
  
  // Generate buildings, trees, and roads based on chunk type
  const buildings = useMemo(() => {
    if (!isCity && !isSuburb) return [];
    
    const buildings: Building[] = [];
    // Significantly reduce building count in cities and make suburbs even less dense
    const buildingCount = isCity 
      ? Math.floor(seededRandom(x * 1000, z * 1000) * 10) + 5 // Reduced from 20+10 to 10+5
      : Math.floor(seededRandom(x * 1000, z * 1000) * 5) + 3; // Even fewer buildings in suburbs
    
    for (let i = 0; i < buildingCount; i++) {
      const bx = (seededRandom(x * 1000 + i, z * 1000) * CHUNK_SIZE) + (x * CHUNK_SIZE);
      const bz = (seededRandom(x * 1000, z * 1000 + i) * CHUNK_SIZE) + (z * CHUNK_SIZE);
      
      // Height varies by area type
      const height = isCity
        ? Math.floor(seededRandom(bx, bz) * 6) + 2 // Taller buildings in cities
        : Math.floor(seededRandom(bx, bz) * 2) + 1; // Lower buildings in suburbs
      
      const width = Math.floor(seededRandom(bx + 1, bz) * 5) + 3;
      const depth = Math.floor(seededRandom(bx, bz + 1) * 5) + 3;
      
      buildings.push({
        x: bx,
        z: bz,
        height,
        width,
        depth
      });
    }
    
    return buildings;
  }, [x, z, isCity, seededRandom]);
  
  const trees = useMemo(() => {
    // No trees in cities, fewer in suburbs
    if (isCity) return [];
    
    const trees: Tree[] = [];
    // Vary tree count by terrain type - fewer in suburbs, more in countryside
    const treeCount = isSuburb
      ? Math.floor(seededRandom(x * 2000, z * 2000) * 20) + 10 // Fewer trees in suburbs
      : Math.floor(seededRandom(x * 2000, z * 2000) * 40) + 15; // Slightly fewer trees in countryside too
    
    for (let i = 0; i < treeCount; i++) {
      const tx = (seededRandom(x * 2000 + i, z * 2000) * CHUNK_SIZE) + (x * CHUNK_SIZE);
      const tz = (seededRandom(x * 2000, z * 2000 + i) * CHUNK_SIZE) + (z * CHUNK_SIZE);
      const height = Math.floor(seededRandom(tx, tz) * 2) + 2;
      const radius = Math.floor(seededRandom(tx + 1, tz) * 2) + 1;
      
      trees.push({
        x: tx,
        z: tz,
        height,
        radius
      });
    }
    
    return trees;
  }, [x, z, isCity, seededRandom]);
  
  const roads = useMemo(() => {
    const roads: Road[] = [];
    
    if (isCity) {
      // City roads in a denser grid pattern
      for (let i = 0; i < CHUNK_SIZE; i += 32) { // Keep grid density the same
        roads.push({
          x1: x * CHUNK_SIZE,
          z1: z * CHUNK_SIZE + i,
          x2: x * CHUNK_SIZE + CHUNK_SIZE,
          z2: z * CHUNK_SIZE + i,
          width: 10 // Slightly wider roads
        });
        
        roads.push({
          x1: x * CHUNK_SIZE + i,
          z1: z * CHUNK_SIZE,
          x2: x * CHUNK_SIZE + i,
          z2: z * CHUNK_SIZE + CHUNK_SIZE,
          width: 10
        });
      }
    } else if (isSuburb) {
      // Suburb roads - less regular pattern with some curves
      // Main roads
      roads.push({
        x1: x * CHUNK_SIZE,
        z1: z * CHUNK_SIZE + CHUNK_SIZE / 3,
        x2: x * CHUNK_SIZE + CHUNK_SIZE,
        z2: z * CHUNK_SIZE + CHUNK_SIZE / 3,
        width: 8
      });
      
      roads.push({
        x1: x * CHUNK_SIZE,
        z1: z * CHUNK_SIZE + CHUNK_SIZE * 2/3,
        x2: x * CHUNK_SIZE + CHUNK_SIZE,
        z2: z * CHUNK_SIZE + CHUNK_SIZE * 2/3,
        width: 8
      });
      
      // Cross roads at irregular intervals
      for (let i = 0; i < 3; i++) {
        const offset = seededRandom(x * 3000 + i, z * 3000) * CHUNK_SIZE * 0.8 + CHUNK_SIZE * 0.1;
        roads.push({
          x1: x * CHUNK_SIZE + offset,
          z1: z * CHUNK_SIZE,
          x2: x * CHUNK_SIZE + offset,
          z2: z * CHUNK_SIZE + CHUNK_SIZE,
          width: 7
        });
      }
    } else {
      // Country roads - now more interesting with occasional crossroads
      // Main road
      roads.push({
        x1: x * CHUNK_SIZE,
        z1: z * CHUNK_SIZE + CHUNK_SIZE / 2,
        x2: x * CHUNK_SIZE + CHUNK_SIZE,
        z2: z * CHUNK_SIZE + CHUNK_SIZE / 2,
        width: 8
      });
      
      // Occasional perpendicular roads in countryside (1 in 3 chance)
      if (seededRandom(x * 4000, z * 4000) > 0.66) {
        roads.push({
          x1: x * CHUNK_SIZE + CHUNK_SIZE / 2,
          z1: z * CHUNK_SIZE,
          x2: x * CHUNK_SIZE + CHUNK_SIZE / 2,
          z2: z * CHUNK_SIZE + CHUNK_SIZE,
          width: 6 // Slightly narrower countryside crossing
        });
      }
      
      // Very occasional diagonal dirt roads (1 in 5 chance)
      if (seededRandom(x * 5000, z * 5000) > 0.8) {
        roads.push({
          x1: x * CHUNK_SIZE,
          z1: z * CHUNK_SIZE,
          x2: x * CHUNK_SIZE + CHUNK_SIZE,
          z2: z * CHUNK_SIZE + CHUNK_SIZE,
          width: 4 // Narrow dirt road
        });
      }
    }
    
    return roads;
  }, [x, z, isCity]);
  
  // Share tree data with the Vehicle component for collision detection
  useEffect(() => {
    // Check if the update function exists (registered by Vehicle component)
    if (window.updateNearbyTrees) {
      const treeData = trees.map(tree => ({
        position: {
          x: tree.x,
          y: 0,
          z: tree.z
        } as PlayerVector3
      }));
      
      window.updateNearbyTrees(treeData);
    }
  }, [trees]);
  
  return (
    <group>
      {/* Render buildings */}
      {buildings.map((building, index) => (
        <BuildingMesh key={`building-${index}`} building={building} />
      ))}
      
      {/* Render trees */}
      {trees.map((tree, index) => (
        <TreeMesh key={`tree-${index}`} tree={tree} />
      ))}
      
      {/* Render roads */}
      {roads.map((road, index) => (
        <RoadMesh key={`road-${index}`} road={road} />
      ))}
    </group>
  );
}

function BuildingMesh({ building }: { building: Building }) {
  return (
    <group position={[building.x, 0, building.z]}>
      <mesh
        castShadow
        receiveShadow
        position={[0, building.height / 2, 0]}
      >
        <boxGeometry args={[building.width, building.height, building.depth]} />
        <meshStandardMaterial color="#CFD8DC" />
      </mesh>
    </group>
  );
}

function TreeMesh({ tree }: { tree: Tree }) {
  return (
    <group position={[tree.x, 0, tree.z]}>
      {/* Tree trunk */}
      <mesh
        castShadow
        receiveShadow
        position={[0, tree.height / 2, 0]}
      >
        <boxGeometry args={[0.5, tree.height, 0.5]} />
        <meshStandardMaterial color="#795548" />
      </mesh>
      
      {/* Tree crown */}
      <mesh
        castShadow
        position={[0, tree.height + tree.radius / 2, 0]}
      >
        <boxGeometry args={[tree.radius * 2, tree.radius * 2, tree.radius * 2]} />
        <meshStandardMaterial color="#4CAF50" />
      </mesh>
    </group>
  );
}

function RoadMesh({ road }: { road: Road }) {
  // Calculate the center position and dimensions of the road
  const centerX = (road.x1 + road.x2) / 2;
  const centerZ = (road.z1 + road.z2) / 2;
  
  // Calculate the length of the road
  const dx = road.x2 - road.x1;
  const dz = road.z2 - road.z1;
  const length = Math.sqrt(dx * dx + dz * dz);
  
  // Calculate the rotation angle of the road
  const angle = Math.atan2(dz, dx);
  
  return (
    <mesh
      position={[centerX, 0.01, centerZ]}
      rotation={[0, angle, 0]}
      receiveShadow
    >
      <planeGeometry args={[length, road.width]} />
      <meshStandardMaterial color="#455A64" side={THREE.DoubleSide} />
    </mesh>
  );
}

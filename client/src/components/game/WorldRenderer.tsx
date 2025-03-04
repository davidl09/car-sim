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
    
    // Generate building clusters rather than individual buildings
    const clusterCount = isCity 
      ? Math.floor(seededRandom(x * 1000, z * 1000) * 5) + 3 // 3-8 clusters in cities
      : Math.floor(seededRandom(x * 1000, z * 1000) * 3) + 1; // 1-4 clusters in suburbs
    
    for (let c = 0; c < clusterCount; c++) {
      // Define cluster center
      const clusterX = (seededRandom(x * 1000 + c, z * 1000) * CHUNK_SIZE * 0.8) + (x * CHUNK_SIZE) + CHUNK_SIZE * 0.1;
      const clusterZ = (seededRandom(x * 1000, z * 1000 + c) * CHUNK_SIZE * 0.8) + (z * CHUNK_SIZE) + CHUNK_SIZE * 0.1;
      
      // Buildings per cluster
      const buildingsInCluster = isCity 
        ? Math.floor(seededRandom(clusterX, clusterZ) * 6) + 3 // 3-9 buildings per city cluster
        : Math.floor(seededRandom(clusterX, clusterZ) * 3) + 2; // 2-5 buildings per suburb cluster

      // Cluster density - how close buildings are to each other
      const clusterRadius = isCity ? 20 : 30; // City clusters are denser
      
      for (let i = 0; i < buildingsInCluster; i++) {
        // Position buildings in a roughly circular pattern around cluster center
        const angle = seededRandom(clusterX + i, clusterZ) * Math.PI * 2;
        const distance = seededRandom(clusterX, clusterZ + i) * clusterRadius;
        
        const bx = clusterX + Math.cos(angle) * distance;
        const bz = clusterZ + Math.sin(angle) * distance;
        
        // Height varies by area type
        const height = isCity
          ? Math.floor(seededRandom(bx, bz) * 10) + 3 // Taller buildings in cities (3-13 units)
          : Math.floor(seededRandom(bx, bz) * 3) + 1; // Lower buildings in suburbs (1-4 units)
        
        const width = Math.floor(seededRandom(bx + 1, bz) * 6) + 4; // 4-10 units wide
        const depth = Math.floor(seededRandom(bx, bz + 1) * 6) + 4; // 4-10 units deep
        
        buildings.push({
          x: bx,
          z: bz,
          height,
          width,
          depth
        });
      }
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
      // City roads in a less dense grid pattern
      for (let i = 0; i < CHUNK_SIZE; i += 64) { // Reduced density from 32 to 64
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
      // Main roads - reduced to just one road for less density
      roads.push({
        x1: x * CHUNK_SIZE,
        z1: z * CHUNK_SIZE + CHUNK_SIZE / 2, // Only one road in middle instead of two
        x2: x * CHUNK_SIZE + CHUNK_SIZE,
        z2: z * CHUNK_SIZE + CHUNK_SIZE / 2,
        width: 8
      });
      
      // Cross roads at irregular intervals - reduced from 3 to 2
      for (let i = 0; i < 2; i++) {
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
      
      // Occasional perpendicular roads in countryside (reduced chance - 1 in 4 instead of 1 in 3)
      if (seededRandom(x * 4000, z * 4000) > 0.75) {
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
          width: 6 // Wider dirt road to show center line
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
  // Generate deterministic pseudo-random value based on building position
  const buildingRandom = (offset = 0) => {
    const seed = building.x * 12345 + building.z * 67890 + offset;
    return ((seed * 1103515245 + 12345) % 2147483647) / 2147483647;
  };
  
  // Generate building color based on height for variety
  const baseColor = building.height > 8 
    ? new THREE.Color("#78909C") // Taller buildings are darker gray 
    : building.height > 4
      ? new THREE.Color("#B0BEC5") // Medium buildings are medium gray
      : new THREE.Color("#ECEFF1"); // Shorter buildings are lighter gray
      
  // Small deterministic variation in color
  const hueAdjust = (buildingRandom(1) - 0.5) * 0.05;
  const buildingColor = baseColor.offsetHSL(hueAdjust, 0, 0);
  
  // Create window texture instead of individual meshes
  const windowCountX = Math.min(5, Math.floor(building.width / 2));
  const windowCountY = Math.min(5, Math.floor(building.height / 1.5));
  
  // Create window texture only if building has windows
  const windowTexture = useMemo(() => {
    if (windowCountX <= 0 || windowCountY <= 0) return null;
    
    const canvas = document.createElement('canvas');
    const size = 512; // Texture size
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    // Fill with transparent background
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, size, size);
    
    // Draw windows
    const windowWidth = size / windowCountX;
    const windowHeight = size / windowCountY;
    
    for (let x = 0; x < windowCountX; x++) {
      for (let y = 0; y < windowCountY; y++) {
        // Use deterministic random to decide if window is lit
        const isLit = buildingRandom(x * 100 + y * 1000 + 2) > 0.7;
        
        // Window spacing
        const padding = Math.min(windowWidth, windowHeight) * 0.2;
        
        // Draw window
        ctx.fillStyle = isLit ? '#FFECB3' : '#263238';
        ctx.fillRect(
          x * windowWidth + padding,
          y * windowHeight + padding,
          windowWidth - padding * 2,
          windowHeight - padding * 2
        );
      }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, [building.x, building.z, windowCountX, windowCountY]);
  
  return (
    <group position={[building.x, 0, building.z]}>
      {/* Main building */}
      <mesh
        castShadow
        receiveShadow
        position={[0, building.height / 2, 0]}
      >
        <boxGeometry args={[building.width, building.height, building.depth]} />
        <meshStandardMaterial color={buildingColor.getStyle()} />
      </mesh>
      
      {/* Roof (for buildings shorter than 8 units) */}
      {building.height < 8 && (
        <mesh
          castShadow
          position={[0, building.height + 0.5, 0]}
        >
          <boxGeometry args={[building.width + 0.5, 1, building.depth + 0.5]} />
          <meshStandardMaterial color="#795548" /> {/* Brown roof */}
        </mesh>
      )}
      
      {/* Windows - front face (as a single textured plane) */}
      {windowTexture && (
        <mesh
          position={[0, building.height / 2, building.depth / 2 + 0.05]}
        >
          <planeGeometry args={[building.width, building.height]} />
          <meshStandardMaterial 
            map={windowTexture} 
            transparent={true}
            emissiveMap={windowTexture}
            emissive={"#FFECB3"}
            emissiveIntensity={0.5}
          />
        </mesh>
      )}
      
      {/* Windows - back face (as a single textured plane) */}
      {windowTexture && (
        <mesh
          position={[0, building.height / 2, -building.depth / 2 - 0.05]}
          rotation={[0, Math.PI, 0]}
        >
          <planeGeometry args={[building.width, building.height]} />
          <meshStandardMaterial 
            map={windowTexture} 
            transparent={true}
            emissiveMap={windowTexture}
            emissive={"#FFECB3"}
            emissiveIntensity={0.5}
          />
        </mesh>
      )}
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
  
  // Create road texture with center line
  const roadTexture = useMemo(() => {
    if (road.width < 6) return null; // Only create texture for roads with center lines
    
    const canvas = document.createElement('canvas');
    const size = 512;
    // Make canvas rectangular - wider in the direction of road
    canvas.width = size;
    canvas.height = size / 4; // Make it shorter in the perpendicular direction
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    // Road background
    ctx.fillStyle = '#455A64';
    ctx.fillRect(0, 0, size, size / 4);
    
    // Only draw center line if road is wide enough
    if (road.width >= 6) {
      // Center line
      const lineWidth = size / 40; // Line width (perpendicular to road direction)
      const segmentLength = size / 10; // Segment length (along road direction)
      const gapLength = size / 10; // Gap length between segments
      
      ctx.fillStyle = '#FFEB3B';
      // Draw dotted line along the X axis of the texture (parallel to road direction)
      for (let x = 0; x < size; x += segmentLength + gapLength) {
        ctx.fillRect(
          x, // X position (along road)
          (size / 4) / 2 - lineWidth / 2, // Y position (center of road)
          segmentLength, // Width (segment length along road)
          lineWidth // Height (line width perpendicular to road)
        );
      }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.repeat.set(length / 20, 1); // Repeat texture based on road length
    texture.wrapS = THREE.RepeatWrapping;
    texture.needsUpdate = true;
    return texture;
  }, [road.width, length]);
  
  return (
    <group position={[centerX, 0, centerZ]} rotation={[0, angle, 0]}>
      {/* Main road surface with texture */}
      <mesh
        position={[0, 0.01, 0]}
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[length, road.width]} />
        {road.width >= 6 && roadTexture ? (
          <meshStandardMaterial 
            map={roadTexture} 
            side={THREE.DoubleSide} 
          />
        ) : (
          <meshStandardMaterial color="#455A64" side={THREE.DoubleSide} />
        )}
      </mesh>
    </group>
  );
}

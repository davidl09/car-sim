import { Chunk } from '../types/world';

export class WorldGenerator {
  private seed: number;
  private chunkSize: number;
  private chunks: Map<string, Chunk>;

  constructor(seed?: number) {
    this.seed = seed || Math.floor(Math.random() * 1000000);
    this.chunkSize = 256; // Size of each chunk (256x256 units)
    this.chunks = new Map<string, Chunk>();
  }

  public getSeed(): number {
    return this.seed;
  }

  public getChunkKey(x: number, z: number): string {
    // Convert world coordinates to chunk coordinates
    const chunkX = Math.floor(x / this.chunkSize);
    const chunkZ = Math.floor(z / this.chunkSize);
    return `${chunkX},${chunkZ}`;
  }

  public getChunk(x: number, z: number): Chunk {
    const chunkKey = this.getChunkKey(x, z);
    
    // If the chunk already exists, return it
    if (this.chunks.has(chunkKey)) {
      return this.chunks.get(chunkKey)!;
    }
    
    // Otherwise, generate a new chunk
    const chunk = this.generateChunk(x, z);
    this.chunks.set(chunkKey, chunk);
    return chunk;
  }

  private generateChunk(x: number, z: number): Chunk {
    const chunkX = Math.floor(x / this.chunkSize);
    const chunkZ = Math.floor(z / this.chunkSize);
    
    // Use deterministic seeded random for consistency
    const chunkSeed = this.seed + (chunkX * 16777259) + (chunkZ * 16777213);
    const random = this.seededRandom(chunkSeed);
    
    // Determine if this is a city or countryside
    // Alternate based on Manhattan distance from origin
    const isCity = (Math.abs(chunkX) + Math.abs(chunkZ)) % 2 === 0;
    
    // Generate the chunk data
    return {
      x: chunkX,
      z: chunkZ,
      isCity,
      terrainHeight: this.generateTerrainHeight(chunkX, chunkZ),
      buildings: isCity ? this.generateBuildings(chunkX, chunkZ, random) : [],
      trees: !isCity ? this.generateTrees(chunkX, chunkZ, random) : [],
      roads: this.generateRoads(chunkX, chunkZ, isCity),
    };
  }

  private generateTerrainHeight(chunkX: number, chunkZ: number): number[][] {
    // Simple terrain height generation (flat for now)
    const terrainHeight: number[][] = [];
    for (let i = 0; i < this.chunkSize; i++) {
      terrainHeight[i] = [];
      for (let j = 0; j < this.chunkSize; j++) {
        terrainHeight[i][j] = 0;
      }
    }
    return terrainHeight;
  }

  private generateBuildings(chunkX: number, chunkZ: number, random: () => number): any[] {
    // Simple building generation
    const buildings = [];
    const buildingCount = Math.floor(random() * 20) + 10; // 10 to 30 buildings

    for (let i = 0; i < buildingCount; i++) {
      const x = Math.floor(random() * this.chunkSize);
      const z = Math.floor(random() * this.chunkSize);
      const height = Math.floor(random() * 5) + 1; // 1 to 5 stories
      const width = Math.floor(random() * 5) + 3; // 3 to 8 units wide
      const depth = Math.floor(random() * 5) + 3; // 3 to 8 units deep

      buildings.push({
        x: chunkX * this.chunkSize + x,
        z: chunkZ * this.chunkSize + z,
        height,
        width,
        depth,
      });
    }

    return buildings;
  }

  private generateTrees(chunkX: number, chunkZ: number, random: () => number): any[] {
    // Simple tree generation
    const trees = [];
    const treeCount = Math.floor(random() * 50) + 20; // 20 to 70 trees

    for (let i = 0; i < treeCount; i++) {
      const x = Math.floor(random() * this.chunkSize);
      const z = Math.floor(random() * this.chunkSize);
      const height = Math.floor(random() * 2) + 2; // 2 to 4 units tall
      const radius = Math.floor(random() * 2) + 1; // 1 to 3 units radius

      trees.push({
        x: chunkX * this.chunkSize + x,
        z: chunkZ * this.chunkSize + z,
        height,
        radius,
      });
    }

    return trees;
  }

  private generateRoads(chunkX: number, chunkZ: number, isCity: boolean): any[] {
    // Simple road generation
    const roads = [];
    
    // Grid-based road system for cities
    if (isCity) {
      // Horizontal roads every 32 units
      for (let i = 0; i < this.chunkSize; i += 32) {
        roads.push({
          x1: chunkX * this.chunkSize,
          z1: chunkZ * this.chunkSize + i,
          x2: chunkX * this.chunkSize + this.chunkSize,
          z2: chunkZ * this.chunkSize + i,
          width: 8,
        });
      }
      
      // Vertical roads every 32 units
      for (let i = 0; i < this.chunkSize; i += 32) {
        roads.push({
          x1: chunkX * this.chunkSize + i,
          z1: chunkZ * this.chunkSize,
          x2: chunkX * this.chunkSize + i,
          z2: chunkZ * this.chunkSize + this.chunkSize,
          width: 8,
        });
      }
    } else {
      // Just a single road through countryside
      roads.push({
        x1: chunkX * this.chunkSize,
        z1: chunkZ * this.chunkSize + this.chunkSize / 2,
        x2: chunkX * this.chunkSize + this.chunkSize,
        z2: chunkZ * this.chunkSize + this.chunkSize / 2,
        width: 8,
      });
    }
    
    return roads;
  }

  // Simple seeded random number generator
  private seededRandom(seed: number): () => number {
    return () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }
}

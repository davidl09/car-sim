export interface Chunk {
  x: number;
  z: number;
  isCity: boolean;
  terrainHeight: number[][];
  buildings: Building[];
  trees: Tree[];
  roads: Road[];
}

export interface Building {
  x: number;
  z: number;
  height: number;
  width: number;
  depth: number;
}

export interface Tree {
  x: number;
  z: number;
  height: number;
  radius: number;
}

export interface Road {
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  width: number;
}

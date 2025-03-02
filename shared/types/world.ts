export interface Vector2 {
  x: number;
  z: number;
}

export interface Chunk {
  x: number;
  z: number;
  isCity: boolean;
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

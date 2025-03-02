export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Player {
  id: string;
  name: string;
  position: Vector3;
  rotation: Vector3;
  velocity: Vector3;
  color: string;
  lastUpdate: number;
}

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
  health: number;
  lastCollision?: number;
  joinTime: number; // When the player joined, used for spawn protection
}

export interface PlayerUpdate {
  position?: Vector3;
  rotation?: Vector3;
  velocity?: Vector3;
  color?: string;
  health?: number;
  lastCollision?: number;
  name?: string;
  joinTime?: number;
}

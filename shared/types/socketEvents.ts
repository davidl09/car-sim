import { Player } from './player';

// Client to Server events
export enum ClientEvents {
  PLAYER_UPDATE = 'player:update',
  PLAYER_CUSTOMIZE = 'player:customize',
  PLAYER_SET_NAME = 'player:setname',
  PLAYER_RESPAWN = 'player:respawn',
}

// Server to Client events
export enum ServerEvents {
  GAME_STATE = 'game:state',
  GAME_UPDATE = 'game:update',
  PLAYER_JOINED = 'player:joined',
  PLAYER_LEFT = 'player:left',
  PLAYER_CUSTOMIZED = 'player:customized',
  PLAYER_NAME_UPDATED = 'player:nameupdated',
  PLAYER_RESPAWNED = 'player:respawned',
}

// Event payload types
export interface GameStatePayload {
  playerId: string;
  players: Player[];
  worldSeed: number;
}

export interface GameUpdatePayload {
  playerId: string;
  position?: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  velocity?: { x: number; y: number; z: number };
}

export interface PlayerJoinedPayload extends Player {}

export interface PlayerCustomizedPayload {
  playerId: string;
  color: string;
}

export interface PlayerNameUpdatePayload {
  playerId: string;
  name: string;
}

export interface PlayerRespawnPayload {
  playerId: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  health: number;
  joinTime: number;
}

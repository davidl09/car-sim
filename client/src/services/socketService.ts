import { io, Socket } from 'socket.io-client';
import { useGameStore } from '@/store/gameStore';
import { 
  ClientEvents, 
  ServerEvents, 
  GameStatePayload, 
  GameUpdatePayload, 
  PlayerJoinedPayload, 
  PlayerCustomizedPayload,
  PlayerNameUpdatePayload,
  PlayerRespawnPayload
} from 'shared/types/socketEvents';
import { PlayerUpdate } from 'shared/types/player';
import { apiConfig } from '@/config/api';

class SocketService {
  private socket: Socket | null = null;

  // Initialize socket connection
  public connect(): void {
    if (this.socket) {
      return;
    }

    this.socket = io(apiConfig.wsUrl, {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.setupListeners();
  }

  // Disconnect socket
  public disconnect(): void {
    if (!this.socket) {
      return;
    }

    this.socket.disconnect();
    this.socket = null;
    useGameStore.getState().setConnectionStatus(false);
  }

  // Set up event listeners for socket events
  private setupListeners(): void {
    if (!this.socket) {
      return;
    }

    // Connection events
    this.socket.on('connect', () => {
      useGameStore.getState().setConnectionStatus(true);
    });

    this.socket.on('disconnect', () => {
      useGameStore.getState().setConnectionStatus(false);
    });

    // Game state event
    this.socket.on(ServerEvents.GAME_STATE, (payload: GameStatePayload) => {
      const { playerId, players, worldSeed } = payload;
      
      useGameStore.getState().setPlayerId(playerId);
      useGameStore.getState().setPlayers(players);
      useGameStore.getState().setWorldSeed(worldSeed);
    });

    // Game update events
    this.socket.on(ServerEvents.GAME_UPDATE, (payload: GameUpdatePayload) => {
      const { playerId, ...updates } = payload;
      useGameStore.getState().updatePlayer(playerId, updates);
    });

    // Player join/leave events
    this.socket.on(ServerEvents.PLAYER_JOINED, (player: PlayerJoinedPayload) => {
      useGameStore.getState().updatePlayer(player.id, player);
    });

    this.socket.on(ServerEvents.PLAYER_LEFT, (playerId: string) => {
      useGameStore.getState().removePlayer(playerId);
    });

    // Player customization event
    this.socket.on(ServerEvents.PLAYER_CUSTOMIZED, (payload: PlayerCustomizedPayload) => {
      const { playerId, color } = payload;
      useGameStore.getState().updatePlayer(playerId, { color });
    });
    
    // Player name update event
    this.socket.on(ServerEvents.PLAYER_NAME_UPDATED, (payload: PlayerNameUpdatePayload) => {
      const { playerId, name } = payload;
      useGameStore.getState().updatePlayer(playerId, { name });
    });
    
    // Player respawn event
    this.socket.on(ServerEvents.PLAYER_RESPAWNED, (payload: PlayerRespawnPayload) => {
      const { playerId, position, rotation, velocity, health, joinTime } = payload;
      useGameStore.getState().updatePlayer(playerId, { 
        position, 
        rotation, 
        velocity, 
        health, 
        joinTime 
      });
    });
  }

  // Send player position update
  public sendPlayerUpdate(update: PlayerUpdate): void {
    if (!this.socket) {
      return;
    }

    this.socket.emit(ClientEvents.PLAYER_UPDATE, update);
  }
  
  // Request a respawn (e.g., after death)
  public requestRespawn(): void {
    if (!this.socket) {
      return;
    }
    
    this.socket.emit(ClientEvents.PLAYER_RESPAWN);
  }

  // Send player customization update
  public customizePlayer(color: string): void {
    if (!this.socket) {
      return;
    }

    this.socket.emit(ClientEvents.PLAYER_CUSTOMIZE, { color });
  }
  
  // Send player name update
  public setPlayerName(name: string): void {
    if (!this.socket) {
      return;
    }
    
    this.socket.emit(ClientEvents.PLAYER_SET_NAME, { name });
  }

  // Check if socket is connected
  public isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

// Export singleton instance
export const socketService = new SocketService();

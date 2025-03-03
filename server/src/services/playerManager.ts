import { Player } from '../types/player';
import crypto from 'crypto';

export class PlayerManager {
  private players: Map<string, Player>;
  private usedNames: Set<string>;

  constructor() {
    this.players = new Map<string, Player>();
    this.usedNames = new Set<string>();
  }

  /**
   * Generate a random hex string of specified length
   */
  private generateRandomHex(length: number = 6): string {
    return crypto.randomBytes(Math.ceil(length / 2))
      .toString('hex')
      .slice(0, length)
      .toUpperCase();
  }
  
  /**
   * Generate a unique default player name
   */
  private generateUniquePlayerName(): string {
    let name: string;
    do {
      const randomHex = this.generateRandomHex(6);
      name = `Player ${randomHex}`;
    } while (this.usedNames.has(name));
    
    this.usedNames.add(name);
    return name;
  }
  
  /**
   * Ensure a player name is unique by appending a number if necessary
   */
  private ensureUniquePlayerName(requestedName: string): string {
    // Skip empty names, they'll be handled by generateUniquePlayerName
    if (requestedName.trim() === '') {
      return this.generateUniquePlayerName();
    }
    
    // Check against existing player names (case insensitive)
    let nameConflict = false;
    
    // First check the usedNames set
    if (this.usedNames.has(requestedName)) {
      nameConflict = true;
    }
    
    // Also check all existing player names to be absolutely sure
    // This double-check ensures we catch any edge cases where usedNames might not be in sync
    if (!nameConflict) {
      const normalizedRequestedName = requestedName.toLowerCase();
      for (const player of this.players.values()) {
        if (player.name.toLowerCase() === normalizedRequestedName) {
          nameConflict = true;
          break;
        }
      }
    }
    
    // If the name is unique, return it
    if (!nameConflict) {
      this.usedNames.add(requestedName);
      return requestedName;
    }
    
    // Otherwise, append a random hex
    let uniqueName: string;
    do {
      const randomHex = this.generateRandomHex(4);
      uniqueName = `${requestedName}_${randomHex}`;
      
      // Check for conflicts with the new name
      nameConflict = this.usedNames.has(uniqueName);
      if (!nameConflict) {
        // Double-check against all players again
        const normalizedName = uniqueName.toLowerCase();
        for (const player of this.players.values()) {
          if (player.name.toLowerCase() === normalizedName) {
            nameConflict = true;
            break;
          }
        }
      }
    } while (nameConflict);
    
    this.usedNames.add(uniqueName);
    return uniqueName;
  }

  /**
   * Generate a random spawn position within a 100x100m square around center of map
   */
  private generateRandomSpawnPosition(): { x: number; y: number; z: number } {
    // The spawn area is a 100x100m square centered at origin (0,0)
    // So positions range from -50 to +50 on x and z axes
    const SPAWN_AREA_SIZE = 100;
    const HALF_SIZE = SPAWN_AREA_SIZE / 2;
    
    // Generate random x and z within the spawn area
    const x = (Math.random() * SPAWN_AREA_SIZE) - HALF_SIZE;
    const z = (Math.random() * SPAWN_AREA_SIZE) - HALF_SIZE;
    
    // Y is fixed at 0 (ground level)
    return { x, y: 0, z };
  }
  
  /**
   * Generate a random rotation for a newly spawned player
   */
  private generateRandomRotation(): { x: number; y: number; z: number } {
    // Only rotate around Y axis (face random direction)
    // Math.random() * 2 * Math.PI gives a random angle in radians (0 to 2π)
    return { x: 0, y: Math.random() * 2 * Math.PI, z: 0 };
  }

  public addPlayer(id: string): Player {
    const currentTime = Date.now();
    
    // Create a new player with default values, random name, and random spawn position
    const player: Player = {
      id,
      name: this.generateUniquePlayerName(),
      position: this.generateRandomSpawnPosition(),
      rotation: this.generateRandomRotation(),
      velocity: { x: 0, y: 0, z: 0 },
      color: this.getRandomColor(),
      lastUpdate: currentTime,
      health: 100, // Start with full health
      joinTime: currentTime, // Record join time for spawn protection
    };

    this.players.set(id, player);
    return player;
  }

  public updatePlayer(id: string, updates: Partial<Player>): Player | null {
    const player = this.players.get(id);
    if (!player) return null;
    
    // Handle name updates specially to ensure uniqueness
    if (updates.name) {
      // Remove the old name from the used names set
      this.usedNames.delete(player.name);
      
      // If empty name provided, generate a random one
      if (updates.name.trim() === '') {
        updates.name = this.generateUniquePlayerName();
      } else {
        // Otherwise ensure the new name is unique
        updates.name = this.ensureUniquePlayerName(updates.name.trim());
      }
    }

    // Update player with new data
    const updatedPlayer = {
      ...player,
      ...updates,
      lastUpdate: Date.now(),
    };

    this.players.set(id, updatedPlayer);
    return updatedPlayer;
  }

  public getPlayer(id: string): Player | undefined {
    return this.players.get(id);
  }
  
  /**
   * Respawn a player at a random position with full health
   */
  public respawnPlayer(id: string): Player | null {
    const player = this.players.get(id);
    if (!player) return null;
    
    const currentTime = Date.now();
    
    // Update the player with new random position and rotation, reset health
    const updatedPlayer = {
      ...player,
      position: this.generateRandomSpawnPosition(),
      rotation: this.generateRandomRotation(),
      velocity: { x: 0, y: 0, z: 0 },
      health: 100, // Reset to full health
      joinTime: currentTime, // Reset join time to enable spawn protection
      lastUpdate: currentTime
    };
    
    this.players.set(id, updatedPlayer);
    return updatedPlayer;
  }

  public removePlayer(id: string): boolean {
    const player = this.players.get(id);
    if (player) {
      // Remove player's name from used names
      this.usedNames.delete(player.name);
    }
    return this.players.delete(id);
  }

  public getAllPlayers(): Player[] {
    return Array.from(this.players.values());
  }

  private getRandomColor(): string {
    const colors = [
      '#FF5252', // Red
      '#FF4081', // Pink
      '#7C4DFF', // Purple
      '#536DFE', // Indigo
      '#448AFF', // Blue
      '#40C4FF', // Light Blue
      '#18FFFF', // Cyan
      '#64FFDA', // Teal
      '#69F0AE', // Green
      '#B2FF59', // Light Green
      '#EEFF41', // Lime
      '#FFFF00', // Yellow
      '#FFD740', // Amber
      '#FFAB40', // Orange
      '#FF6E40', // Deep Orange
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}

import { Player } from '../types/player';

export class PlayerManager {
  private players: Map<string, Player>;

  constructor() {
    this.players = new Map<string, Player>();
  }

  public addPlayer(id: string): Player {
    // Create a new player with default values
    const player: Player = {
      id,
      name: `Player ${id.substring(0, 4)}`, // Default name, will be updated when user sets it
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      color: this.getRandomColor(),
      lastUpdate: Date.now(),
    };

    this.players.set(id, player);
    return player;
  }

  public updatePlayer(id: string, updates: Partial<Player>): Player | null {
    const player = this.players.get(id);
    if (!player) return null;

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

  public removePlayer(id: string): boolean {
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

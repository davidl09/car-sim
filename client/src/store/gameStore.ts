import { create } from 'zustand';
import { Player } from 'shared/types/player';
interface GameState {
  playerId: string | null;
  players: Record<string, Player>;
  worldSeed: number | null;
  isConnected: boolean;
  
  // Actions
  setPlayerId: (id: string) => void;
  setWorldSeed: (seed: number) => void;
  setPlayers: (players: Player[]) => void;
  updatePlayer: (id: string, updates: Partial<Player>) => void;
  removePlayer: (id: string) => void;
  setConnectionStatus: (status: boolean) => void;
  
  // Health-related actions
  damagePlayer: (id: string, amount: number) => void;
  resetHealth: (id: string) => void;
}

export const useGameStore = create<GameState>((set) => ({
  playerId: null,
  players: {},
  worldSeed: null,
  isConnected: false,
  
  setPlayerId: (id) => set({ playerId: id }),
  
  setWorldSeed: (seed) => set({ worldSeed: seed }),
  
  setPlayers: (players) => set((/* state */) => {
    const playersMap: Record<string, Player> = {};
    players.forEach(player => {
      playersMap[player.id] = player;
    });
    return { players: playersMap };
  }),
  
  updatePlayer: (id, updates) => set((state) => {
    const player = state.players[id];
    
    // If player doesn't exist, create a new player entry with defaults
    if (!player) {
      // Only log player creation, not regular updates
      console.log(`Creating new player in store with ID: ${id}`);
      return {
        players: {
          ...state.players,
          [id]: {
            id,
            name: `Player ${id.substring(0, 4)}`,
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            velocity: { x: 0, y: 0, z: 0 },
            color: '#FF5252',
            health: 100,
            lastUpdate: Date.now(),
            joinTime: Date.now(), // Initialize join time for spawn protection
            ...updates, // Apply the updates on top of the defaults
          }
        }
      };
    }
    
    // If player exists, update their data without logging
    // Remove console log that happens on every frame
    return {
      players: {
        ...state.players,
        [id]: {
          ...player,
          ...updates,
        }
      }
    };
  }),
  
  removePlayer: (id) => set((state) => {
    const players = { ...state.players };
    delete players[id];
    return { players };
  }),
  
  setConnectionStatus: (status) => set({ isConnected: status }),
  
  // Apply damage to a player
  damagePlayer: (id, amount) => set((state) => {
    const player = state.players[id];
    if (!player) return state;
    
    // Ensure health is a valid number, defaulting to 100 if it's NaN
    const currentHealth = isNaN(player.health) ? 100 : player.health;
    
    // Calculate new health, ensuring it doesn't go below 0
    const newHealth = Math.max(0, currentHealth - amount);
    
    // Set the last collision time
    const lastCollision = Date.now();
    
    return {
      players: {
        ...state.players,
        [id]: {
          ...player,
          health: newHealth,
          lastCollision
        }
      }
    };
  }),
  
  // Reset a player's health to 100%
  resetHealth: (id) => set((state) => {
    const player = state.players[id];
    if (!player) return state;
    
    return {
      players: {
        ...state.players,
        [id]: {
          ...player,
          health: 100
        }
      }
    };
  }),
}));

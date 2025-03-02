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
}

export const useGameStore = create<GameState>((set) => ({
  playerId: null,
  players: {},
  worldSeed: null,
  isConnected: false,
  
  setPlayerId: (id) => set({ playerId: id }),
  
  setWorldSeed: (seed) => set({ worldSeed: seed }),
  
  setPlayers: (players) => set((state) => {
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
            lastUpdate: Date.now(),
            ...updates, // Apply the updates on top of the defaults
          }
        }
      };
    }
    
    // If player exists, update their data
    console.log(`Updating existing player in store with ID: ${id}`);
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
}));

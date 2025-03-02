import { Server, Socket } from 'socket.io';
import { PlayerManager } from './playerManager';
import { WorldGenerator } from './worldGenerator';

// Initialize services
const playerManager = new PlayerManager();
const worldGenerator = new WorldGenerator();

export const setupSocketHandlers = (io: Server): void => {
  io.on('connection', (socket: Socket) => {
    console.log(`Player connected: ${socket.id}`);
    
    // Add player to the game
    const player = playerManager.addPlayer(socket.id);
    
    // Send initial game state to the new player
    socket.emit('game:state', {
      playerId: socket.id,
      players: playerManager.getAllPlayers(),
      worldSeed: worldGenerator.getSeed(),
    });
    
    // Log connected players for debugging
    console.log(`Currently connected players: ${playerManager.getAllPlayers().length}`);
    playerManager.getAllPlayers().forEach(p => {
      console.log(` > Player: ${p.id}, Color: ${p.color}`);
    });
    
    // Broadcast to other players that a new player joined
    console.log(`Broadcasting player:joined event for player ${socket.id}`);
    socket.broadcast.emit('player:joined', player);
    
    // For increased reliability, send the joined event again after a short delay
    // This helps if the first broadcast was missed
    setTimeout(() => {
      console.log(`Re-broadcasting player:joined event for player ${socket.id}`);
      socket.broadcast.emit('player:joined', player);
    }, 1000);
    
    // Make sure the new player is visible by sending an immediate position update
    setTimeout(() => {
      // This ensures the player is properly initialized in all clients
      console.log(`Sending extra game:update event for player ${socket.id}`);
      socket.broadcast.emit('game:update', {
        playerId: socket.id,
        position: player.position,
        rotation: player.rotation,
        velocity: player.velocity,
        color: player.color
      });
    }, 2000);
    
    // Handle player position updates
    socket.on('player:update', (data) => {
      playerManager.updatePlayer(socket.id, data);
      // Broadcast the update to all other players
      socket.broadcast.emit('game:update', {
        playerId: socket.id,
        ...data,
      });
    });
    
    // Handle player customization (like color changes)
    socket.on('player:customize', (data) => {
      playerManager.updatePlayer(socket.id, data);
      io.emit('player:customized', {
        playerId: socket.id,
        ...data,
      });
    });
    
    // Handle player name update
    socket.on('player:setname', (data) => {
      const { name } = data;
      console.log(`Player ${socket.id} set name to: ${name}`);
      playerManager.updatePlayer(socket.id, { name });
      io.emit('player:nameupdated', {
        playerId: socket.id,
        name,
      });
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`Player disconnected: ${socket.id}`);
      playerManager.removePlayer(socket.id);
      io.emit('player:left', socket.id);
    });
  });
};

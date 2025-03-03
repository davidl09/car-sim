import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import styles from './Minimap.module.css';

// Minimap display radius in game units (1km = 1000 units)
const DISPLAY_RADIUS = 1000;
// Size of the minimap in pixels
const MINIMAP_SIZE = 150;
// Radius in pixels
const MINIMAP_RADIUS = MINIMAP_SIZE / 2;
// Scale factor to convert game units to pixels on the minimap
const SCALE_FACTOR = MINIMAP_RADIUS / DISPLAY_RADIUS;

export const Minimap: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Track which players have been seen on the minimap
  const [knownPlayers, setKnownPlayers] = useState<Record<string, { firstSeen: number }>>({});
  
  // Get all player data from the game store
  const players = useGameStore((state) => state.players);
  const currentPlayerId = useGameStore((state) => state.playerId);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !currentPlayerId || !players[currentPlayerId]) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Get current player position
    const currentPlayer = players[currentPlayerId];
    const centerX = currentPlayer.position.x;
    const centerZ = currentPlayer.position.z;
    
    // Clear canvas
    ctx.clearRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);
    
    // Draw minimap background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.arc(MINIMAP_RADIUS, MINIMAP_RADIUS, MINIMAP_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(MINIMAP_RADIUS, MINIMAP_RADIUS, MINIMAP_RADIUS - 1, 0, Math.PI * 2);
    ctx.stroke();
    
    // Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    
    // Draw horizontal grid lines
    for (let i = -DISPLAY_RADIUS; i <= DISPLAY_RADIUS; i += 200) {
      const y = MINIMAP_RADIUS + (i * SCALE_FACTOR);
      if (y >= 0 && y <= MINIMAP_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(MINIMAP_SIZE, y);
        ctx.stroke();
      }
    }
    
    // Draw vertical grid lines
    for (let i = -DISPLAY_RADIUS; i <= DISPLAY_RADIUS; i += 200) {
      const x = MINIMAP_RADIUS + (i * SCALE_FACTOR);
      if (x >= 0 && x <= MINIMAP_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, MINIMAP_SIZE);
        ctx.stroke();
      }
    }
    
    // Draw a bolder center crosshair
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    
    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(MINIMAP_RADIUS - 5, MINIMAP_RADIUS);
    ctx.lineTo(MINIMAP_RADIUS + 5, MINIMAP_RADIUS);
    ctx.stroke();
    
    // Vertical line
    ctx.beginPath();
    ctx.moveTo(MINIMAP_RADIUS, MINIMAP_RADIUS - 5);
    ctx.lineTo(MINIMAP_RADIUS, MINIMAP_RADIUS + 5);
    ctx.stroke();
    
    // Draw direction indicators (N, S, E, W)
    ctx.font = '10px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // North
    ctx.fillText('N', MINIMAP_RADIUS, 10);
    // South
    ctx.fillText('S', MINIMAP_RADIUS, MINIMAP_SIZE - 10);
    // East
    ctx.fillText('E', MINIMAP_SIZE - 10, MINIMAP_RADIUS);
    // West
    ctx.fillText('W', 10, MINIMAP_RADIUS);
    
    // Draw scale indicator
    const scaleLength = 200 * SCALE_FACTOR; // 200 game units = 200m
    
    // Scale line
    ctx.beginPath();
    ctx.moveTo(10, MINIMAP_SIZE - 20);
    ctx.lineTo(10 + scaleLength, MINIMAP_SIZE - 20);
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Scale text
    ctx.font = '8px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText('200m', 10 + (scaleLength / 2), MINIMAP_SIZE - 10);
    
    // Track newly discovered players and update known players
    const newKnownPlayers = {...knownPlayers};
    
    // Draw player dots
    Object.values(players).forEach(player => {
      // Skip self processing from known players check
      if (player.id !== currentPlayerId) {
        // If this is a new player, add them to known players
        if (!newKnownPlayers[player.id]) {
          newKnownPlayers[player.id] = { firstSeen: Date.now() };
        }
      }
      
      // Calculate relative position
      const relativeX = player.position.x - centerX;
      const relativeZ = player.position.z - centerZ;
      
      // Skip if outside of display radius
      if (Math.abs(relativeX) > DISPLAY_RADIUS || Math.abs(relativeZ) > DISPLAY_RADIUS) {
        return;
      }
      
      // Convert to minimap coordinates
      const minimapX = MINIMAP_RADIUS + (relativeX * SCALE_FACTOR);
      const minimapY = MINIMAP_RADIUS + (relativeZ * SCALE_FACTOR);
      
      // Skip if outside the circular map
      const distanceFromCenter = Math.sqrt(Math.pow(minimapX - MINIMAP_RADIUS, 2) + Math.pow(minimapY - MINIMAP_RADIUS, 2));
      if (distanceFromCenter > MINIMAP_RADIUS) {
        return;
      }
      
      // Check if this is a newly discovered player (within the last 3 seconds)
      const isNewlyDiscovered = 
        player.id !== currentPlayerId && 
        newKnownPlayers[player.id] && 
        Date.now() - newKnownPlayers[player.id].firstSeen < 3000;
      
      // Draw player dot with pulsing effect for newly discovered players
      if (isNewlyDiscovered) {
        // Pulsing animation for new players
        const pulseFactor = 0.5 + Math.sin(Date.now() * 0.01) * 0.5;
        ctx.fillStyle = player.color || '#FF0000';
        ctx.beginPath();
        
        // Bigger pulsing dot for new players
        const pulseSize = 5 + (pulseFactor * 3);
        ctx.arc(minimapX, minimapY, pulseSize, 0, Math.PI * 2);
        ctx.globalAlpha = 0.6 + (pulseFactor * 0.4);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      } else {
        // Regular dot for known players
        ctx.fillStyle = player.color || '#FF0000';
        ctx.beginPath();
        
        // Make current player's dot slightly larger
        const dotSize = player.id === currentPlayerId ? 4 : 3;
        ctx.arc(minimapX, minimapY, dotSize, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Add direction indicator for current player
      if (player.id === currentPlayerId) {
        const dirX = Math.sin(player.rotation.y) * 8;
        const dirZ = Math.cos(player.rotation.y) * 8;
        
        ctx.beginPath();
        ctx.moveTo(minimapX, minimapY);
        ctx.lineTo(minimapX + dirX, minimapY + dirZ);
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
    
    // Update known players state if changed
    if (Object.keys(newKnownPlayers).length !== Object.keys(knownPlayers).length) {
      setKnownPlayers(newKnownPlayers);
    }
    
  }, [players, currentPlayerId]);
  
  return (
    <div className={styles.minimapContainer}>
      <canvas
        ref={canvasRef}
        width={MINIMAP_SIZE}
        height={MINIMAP_SIZE}
        className={styles.minimap}
      />
    </div>
  );
};

export default Minimap;

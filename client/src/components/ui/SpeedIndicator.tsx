import React from 'react';
import { useGameStore } from '@/store/gameStore';
import '@/styles/SpeedIndicator.css';

// Convert internal speed units to km/h for display
const SPEED_MULTIPLIER = 200;

export function SpeedIndicator() {
  const playerId = useGameStore((state) => state.playerId);
  const player = useGameStore((state) => 
    playerId ? state.players[playerId] : null
  );
  
  // Calculate speed from velocity
  const speed = React.useMemo(() => {
    if (!player) return 0;
    
    // Calculate magnitude of velocity
    const velocity = player.velocity;
    const speedMagnitude = Math.sqrt(
      velocity.x * velocity.x + 
      velocity.y * velocity.y + 
      velocity.z * velocity.z
    );
    
    // Convert to km/h for display
    return Math.round(speedMagnitude * SPEED_MULTIPLIER);
  }, [player]);
  
  return (
    <div className="speed-indicator">
      <div className="speed-value">{speed}</div>
      <div className="speed-unit">km/h</div>
    </div>
  );
}

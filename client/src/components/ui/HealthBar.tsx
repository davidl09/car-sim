import React from 'react';
import { useGameStore } from '@/store/gameStore';
import '@/styles/HealthBar.css';

interface HealthBarProps {
  maxHealth?: number;
}

export function HealthBar({ maxHealth = 100 }: HealthBarProps) {
  // Connect to the player health from game store
  const playerId = useGameStore((state) => state.playerId);
  const playerHealth = useGameStore((state) => 
    playerId ? state.players[playerId]?.health ?? maxHealth : maxHealth
  );
  
  // Calculate health percentage with safety check for NaN
  const healthPercentage = isNaN(playerHealth) ? 100 : Math.max(0, Math.min(100, (playerHealth / maxHealth) * 100));
  
  // Determine the color based on health percentage
  const getHealthColor = () => {
    if (healthPercentage > 70) return '#4CAF50'; // Green
    if (healthPercentage > 30) return '#FFC107'; // Yellow/Amber
    return '#F44336'; // Red
  };

  return (
    <div className="health-bar-container">
      <div className="health-bar-label">HEALTH</div>
      <div className="health-bar-outer">
        <div 
          className="health-bar-inner"
          style={{ 
            width: `${healthPercentage}%`,
            backgroundColor: getHealthColor()
          }}
        />
      </div>
      <div className="health-value">{Math.round(healthPercentage)}%</div>
    </div>
  );
}

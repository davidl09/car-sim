import { useState, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { socketService } from '@/services/socketService';
import styles from './NamePrompt.module.css';

export function NamePrompt() {
  const [name, setName] = useState('');
  const [isVisible, setIsVisible] = useState(true);
  const playerId = useGameStore((state) => state.playerId);
  const players = useGameStore((state) => state.players);
  
  // Hide prompt if player already has a custom name
  useEffect(() => {
    if (playerId && players[playerId]) {
      const playerName = players[playerId].name || '';
      // If the name has been customized (not the default), hide the prompt
      if (playerName && !playerName.startsWith('Player ')) {
        setIsVisible(false);
      }
    }
  }, [playerId, players]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (name.trim().length > 0) {
      socketService.setPlayerName(name.trim());
      setIsVisible(false);
    }
  };
  
  if (!isVisible) {
    return null;
  }
  
  return (
    <div className={styles.overlay}>
      <div className={styles.promptContainer}>
        <h2>Enter Your Name</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            maxLength={15}
            autoFocus
            className={styles.nameInput}
          />
          <button type="submit" className={styles.submitButton}>
            Start Driving
          </button>
        </form>
      </div>
    </div>
  );
}

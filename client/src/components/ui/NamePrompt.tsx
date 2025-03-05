import { useState, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { socketService } from '@/services/socketService';
import styles from './NamePrompt.module.css';

interface NamePromptProps {
  onNameSubmitted?: () => void;
}

export function NamePrompt({ onNameSubmitted }: NamePromptProps) {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const playerId = useGameStore((state) => state.playerId);
  const players = useGameStore((state) => state.players);
  
  // Check if on mobile device on mount
  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent));
  }, []);
  
  // Auto-submit a random name after 10 seconds on mobile
  useEffect(() => {
    if (isMobile) {
      const timer = setTimeout(() => {
        if (!name && onNameSubmitted) {
          handleSubmit(new Event('submit') as unknown as React.FormEvent);
        }
      }, 10000);
      
      return () => clearTimeout(timer);
    }
  }, [isMobile, name, onNameSubmitted]);
  
  // If player already has a custom name, skip the prompt
  useEffect(() => {
    if (playerId && players[playerId]) {
      const playerName = players[playerId].name || '';
      // If the name has been customized (not the default), skip this step
      if (playerName && !playerName.startsWith('Player ')) {
        if (onNameSubmitted) {
          onNameSubmitted();
        }
      }
    }
  }, [playerId, players, onNameSubmitted]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsLoading(true);
    
    // Send name to server even if empty - server will generate a random name
    socketService.setPlayerName(name.trim());
    
    // Allow some time for the name to be processed
    setTimeout(() => {
      setIsLoading(false);
      if (onNameSubmitted) {
        onNameSubmitted();
      }
    }, 500);
  };
  
  return (
    <div className={styles.overlay}>
      <div className={styles.promptContainer}>
        <h2>{isMobile ? 'Enter Name' : 'Enter Your Name'}</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={isMobile ? "Tap to enter name" : "Leave empty for random name"}
            maxLength={15}
            autoFocus={!isMobile} // Only autofocus on desktop
            className={styles.nameInput}
            disabled={isLoading}
          />
          <button 
            type="submit" 
            className={styles.submitButton}
            disabled={isLoading}
          >
            {isLoading ? '⏳ Setting Name...' : isMobile ? 'Start' : 'Start Driving'}
          </button>
        </form>
      </div>
    </div>
  );
}

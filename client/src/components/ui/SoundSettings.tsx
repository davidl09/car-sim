import { useState, useEffect } from 'react';
import { audioService } from '@/services/audioService';
import styles from './SoundSettings.module.css';

export function SoundSettings() {
  const [engineVolume, setEngineVolume] = useState<number>(0.5);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  
  // Update audio service when volume changes
  useEffect(() => {
    audioService.setEngineVolume(engineVolume);
  }, [engineVolume]);
  
  // Handle volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setEngineVolume(newVolume);
  };
  
  // Toggle settings visibility
  const toggleSettings = () => {
    setShowSettings(prev => !prev);
  };
  
  return (
    <div className={styles.soundSettings}>
      <button 
        className={styles.soundToggle} 
        onClick={toggleSettings}
        title="Sound Settings"
      >
        🔊
      </button>
      
      {showSettings && (
        <div className={styles.settingsPanel}>
          <div className={styles.settingItem}>
            <label htmlFor="engineVolume">Engine Volume:</label>
            <input
              id="engineVolume"
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={engineVolume}
              onChange={handleVolumeChange}
            />
            <span>{Math.round(engineVolume * 100)}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { audioService } from '@/services/audioService';
import styles from './AudioButton.module.css';

/**
 * A button component that prompts users to enable audio
 * This addresses browser autoplay restrictions by requiring explicit user interaction
 */
export function AudioButton() {
  const [showPrompt, setShowPrompt] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(false);

  // Enable audio on button click
  const enableAudio = () => {
    console.log('User clicked to enable audio');
    // The audioService will detect this click and enable audio
    // We don't need to call anything specific here
    
    setShowPrompt(false);
    setAudioEnabled(true);
    
    // Try to start the engine sound now that we have user interaction
    audioService.startEngine();
  };

  // If this component is visible for 15 seconds, auto-hide it
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowPrompt(false);
    }, 15000);

    return () => clearTimeout(timer);
  }, []);

  if (!showPrompt) return null;

  return (
    <div className={styles.audioPrompt}>
      <div className={styles.audioCard}>
        <h3>Enable Engine Sounds?</h3>
        <p>Click the button below to enable engine sounds for a better experience.</p>
        <button 
          className={styles.enableButton}
          onClick={enableAudio}
        >
          {audioEnabled ? '🔊 Enabled' : '🔊 Enable Engine Sounds'}
        </button>
      </div>
    </div>
  );
}

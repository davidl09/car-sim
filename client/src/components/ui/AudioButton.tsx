import { useState, useEffect } from 'react';
import { audioService } from '@/services/audioService';
import styles from './AudioButton.module.css';

/**
 * A button component that prompts users to enable audio
 * This addresses browser autoplay restrictions by requiring explicit user interaction
 * Optimized for mobile devices with improved loading sequence
 */
export function AudioButton({ onAudioEnabled }: { onAudioEnabled?: () => void }) {
  const [showPrompt, setShowPrompt] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if we're on mobile on mount
  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent));
  }, []);

  // Enable audio on button click
  const enableAudio = () => {
    // Show loading state
    setIsLoading(true);
    
    // Initialize audio system
    audioService.initAudio()
      .then(() => {
        // Start engine sound after initialization
        return audioService.startEngine();
      })
      .then(() => {
        // Hide button and show loading is complete
        setShowPrompt(false);
        setAudioEnabled(true);
        setIsLoading(false);
        
        // Notify parent component that audio is enabled
        if (onAudioEnabled) {
          onAudioEnabled();
        }
      })
      .catch(error => {
        // Handle errors gracefully
        console.error("Failed to enable audio:", error);
        setIsLoading(false);
        setAudioEnabled(true);
        setShowPrompt(false);
        
        // Still notify parent component even if there was an error
        if (onAudioEnabled) {
          onAudioEnabled();
        }
      });
  };

  // If this component is visible for 15 seconds, auto-hide it and proceed
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowPrompt(false);
      if (onAudioEnabled) {
        onAudioEnabled();
      }
    }, 15000);

    return () => clearTimeout(timer);
  }, [onAudioEnabled]);

  if (!showPrompt) return null;

  return (
    <div className={styles.audioPrompt}>
      <div className={styles.audioCard}>
        <h3>{isMobile ? 'Enable Sound?' : 'Enable Engine Sounds?'}</h3>
        <p>{isMobile ? 'Tap the button below to enable sounds.' : 'Click the button below to enable engine sounds for a better experience.'}</p>
        <button 
          className={styles.enableButton}
          onClick={enableAudio}
          disabled={isLoading}
        >
          {isLoading ? '⏳ Initializing...' : audioEnabled ? '🔊 Enabled' : '🔊 Enable Sounds'}
        </button>
      </div>
    </div>
  );
}

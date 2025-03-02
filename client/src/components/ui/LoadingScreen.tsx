import { useEffect, useState } from 'react';
import '@/styles/LoadingScreen.css';

interface LoadingScreenProps {
  isConnected: boolean;
  loadingProgress: number;
}

export function LoadingScreen({ isConnected, loadingProgress }: LoadingScreenProps) {
  const [loadingText, setLoadingText] = useState('Connecting to server...');
  const [dots, setDots] = useState('');
  
  // Update loading text based on connection status
  useEffect(() => {
    if (isConnected) {
      setLoadingText('Loading game assets');
    } else {
      setLoadingText('Connecting to server');
    }
  }, [isConnected]);
  
  // Animate loading dots
  useEffect(() => {
    const intervalId = setInterval(() => {
      setDots(prev => {
        if (prev.length >= 3) {
          return '';
        }
        return prev + '.';
      });
    }, 500);
    
    return () => {
      clearInterval(intervalId);
    };
  }, []);
  
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <h1>Car Simulator</h1>
        <div className="loading-bar-container">
          <div 
            className="loading-bar" 
            style={{ width: `${Math.min(100, loadingProgress)}%` }}
          />
        </div>
        <p className="loading-text">
          {loadingText}{dots}
        </p>
        <p className="connection-status">
          {isConnected ? '✓ Connected' : 'Connecting...'}
        </p>
      </div>
    </div>
  );
}

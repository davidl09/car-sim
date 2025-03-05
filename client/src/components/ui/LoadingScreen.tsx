import { useEffect, useState } from 'react';
import '@/styles/LoadingScreen.css';

interface LoadingScreenProps {
  isConnected: boolean;
  loadingProgress: number;
}

export function LoadingScreen({ isConnected, loadingProgress }: LoadingScreenProps) {
  const [loadingText, setLoadingText] = useState('Connecting to server...');
  const [dots, setDots] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  
  // Check if on mobile device on mount
  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent));
  }, []);
  
  // Update loading text based on connection status and progress
  useEffect(() => {
    if (isConnected) {
      if (loadingProgress < 30) {
        setLoadingText('Initializing game engine');
      } else if (loadingProgress < 60) {
        setLoadingText('Preparing world');
      } else if (loadingProgress < 90) {
        setLoadingText('Loading assets');
      } else {
        setLoadingText('Starting game');
      }
    } else {
      setLoadingText('Connecting to server');
    }
  }, [isConnected, loadingProgress]);
  
  // Animate loading dots - slower on mobile to reduce CPU usage
  useEffect(() => {
    const intervalId = setInterval(() => {
      setDots(prev => {
        if (prev.length >= 3) {
          return '';
        }
        return prev + '.';
      });
    }, isMobile ? 700 : 500); // Slower animation on mobile
    
    return () => {
      clearInterval(intervalId);
    };
  }, [isMobile]);
  
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
        {isMobile && loadingProgress > 80 && (
          <p className="mobile-tip">
            Tip: For best performance, use landscape mode
          </p>
        )}
      </div>
    </div>
  );
}

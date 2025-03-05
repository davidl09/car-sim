import { useEffect, useState } from 'react';
import { Game } from '@/components/game/Game';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { SpeedDial } from '@/components/ui/SpeedDial';
import { HealthBar } from '@/components/ui/HealthBar';
import { NamePrompt } from '@/components/ui/NamePrompt';
import { SoundSettings } from '@/components/ui/SoundSettings';
import { AudioButton } from '@/components/ui/AudioButton';
import { Minimap } from '@/components/ui/Minimap';
import { useGameStore } from '@/store/gameStore';
import { socketService } from '@/services/socketService';
import '@/styles/App.css';

// Improved loading and resource initialization flow
function App() {
  // Loading states
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [nameProvided, setNameProvided] = useState(false);
  
  // Game state
  const isConnected = useGameStore((state) => state.isConnected);
  const playerId = useGameStore((state) => state.playerId);
  
  useEffect(() => {
    // Start server connection (device detection is now handled by individual components)
    
    // Start server connection
    socketService.connect();
    
    // Simulate loading progress with periodic updates
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += 5;
      setLoadingProgress(Math.min(progress, 90)); // Cap at 90% until connection is confirmed
      
      if (progress >= 90) {
        clearInterval(progressInterval);
      }
    }, 200);
    
    // Set loading to complete after server connection
    const checkConnection = setInterval(() => {
      if (isConnected && playerId) {
        clearInterval(checkConnection);
        setLoadingProgress(100);
        setLoading(false);
      }
    }, 500);
    
    // Cleanup on unmount
    return () => {
      clearInterval(progressInterval);
      clearInterval(checkConnection);
      socketService.disconnect();
    };
  }, [isConnected, playerId]);
  
  // Handle audio initialization completion
  const handleAudioEnabled = () => {
    setAudioEnabled(true);
  };
  
  // Handle name submission completion
  const handleNameProvided = () => {
    setNameProvided(true);
  };
  
  // Show loading screen until resources are loaded and connection is established
  if (loading || !isConnected || !playerId) {
    return (
      <LoadingScreen 
        isConnected={isConnected} 
        loadingProgress={loadingProgress} 
      />
    );
  }
  
  // Show audio button first
  if (!audioEnabled) {
    return (
      <AudioButton onAudioEnabled={handleAudioEnabled} />
    );
  }
  
  // Then show name prompt
  if (!nameProvided) {
    return (
      <NamePrompt onNameSubmitted={handleNameProvided} />
    );
  }
  
  // Finally show the full game
  return (
    <div className="app-container">
      <Game />
      <div className="ui-container">
        <div className="top-controls">
          <div className="control-stack">
            <ColorPicker 
              onColorSelect={(color) => socketService.customizePlayer(color)} 
            />
            <SoundSettings />
          </div>
        </div>
        <SpeedDial />
        <HealthBar />
        <Minimap />
      </div>
    </div>
  );
}

export default App;

import { useEffect, useState } from 'react';
import { Game } from '@/components/game/Game';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { SpeedIndicator } from '@/components/ui/SpeedIndicator';
import { NamePrompt } from '@/components/ui/NamePrompt';
import { useGameStore } from '@/store/gameStore';
import { socketService } from '@/services/socketService';
import '@/styles/App.css';

function App() {
  const [loading, setLoading] = useState(true);
  const isConnected = useGameStore((state) => state.isConnected);
  const playerId = useGameStore((state) => state.playerId);
  
  useEffect(() => {
    // Connect to the server
    socketService.connect();
    
    // Set a timeout to simulate loading resources
    const loadingTimeout = setTimeout(() => {
      setLoading(false);
    }, 3000);
    
    // Cleanup on unmount
    return () => {
      clearTimeout(loadingTimeout);
      socketService.disconnect();
    };
  }, []);
  
  // Show loading screen until resources are loaded and connection is established
  if (loading || !isConnected || !playerId) {
    return <LoadingScreen 
      isConnected={isConnected} 
      loadingProgress={loading ? Math.random() * 100 : 100} 
    />;
  }
  
  return (
    <div className="app-container">
      <Game />
      <div className="ui-container">
        <ColorPicker 
          onColorSelect={(color) => socketService.customizePlayer(color)} 
        />
        <SpeedIndicator />
      </div>
      <NamePrompt />
    </div>
  );
}

export default App;

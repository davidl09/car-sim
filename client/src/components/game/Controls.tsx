import { useEffect } from 'react';
import { useKeyboardControls } from '@react-three/drei';

export function Controls() {
  const [, getKeys] = useKeyboardControls();
  
  useEffect(() => {
    const handleKeyEvents = () => {
      const { forward, back, left, right, jump, brake } = getKeys();
      
      // Log controls for debugging
      if (import.meta.env.DEV) {
        console.log({
          forward,
          back,
          left,
          right,
          jump,
          brake
        });
      }
    };
    
    // Set up an interval to check and log key states
    const intervalId = setInterval(handleKeyEvents, 500);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [getKeys]);
  
  return null; // This is a "headless" component, no visible output
}

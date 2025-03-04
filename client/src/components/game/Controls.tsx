import { useEffect, useState, useRef, useCallback } from 'react';
import { useKeyboardControls } from '@react-three/drei';
import { isMobileDevice } from '@/utils/deviceDetection';
import { Joystick } from '../ui/Joystick';

// Custom hook to manage controls state whether from keyboard or joystick
export function useControls() {
  const [, getKeyboardControls] = useKeyboardControls();
  const [isMobile, setIsMobile] = useState(false);
  
  // Store joystick controls in a ref to avoid re-renders
  const joystickControlsRef = useRef({
    forward: false,
    back: false,
    left: false,
    right: false,
    brake: false,
    jump: false,
    cameraSwitch: false,
  });
  
  // Check if using mobile device
  useEffect(() => {
    setIsMobile(isMobileDevice());
  }, []);
  
  // Get the current controls state depending on device type
  const getControls = useCallback(() => {
    if (isMobile) {
      return joystickControlsRef.current;
    } else {
      return getKeyboardControls();
    }
  }, [isMobile, getKeyboardControls]);
  
  // Callback to update joystick controls
  const updateJoystickControls = useCallback((controls: {
    forward: boolean;
    back: boolean;
    left: boolean;
    right: boolean;
    brake: boolean;
    cameraSwitch: boolean;
  }) => {
    joystickControlsRef.current = {
      ...joystickControlsRef.current,
      ...controls,
    };
  }, []);
  
  return {
    isMobile,
    getControls,
    updateJoystickControls,
  };
}

// The Controls component renders the joystick for mobile or debugging info for desktop
export function Controls() {
  const { isMobile, updateJoystickControls, getControls } = useControls();
  
  // Debug logging for development
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    
    const handleKeyEvents = () => {
      const controls = getControls();
      console.log('Controls:', controls);
    };
    
    const intervalId = setInterval(handleKeyEvents, 500);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [getControls]);
  
  if (isMobile) {
    return <Joystick onControlsChange={updateJoystickControls} />;
  }
  
  return null; // This is a "headless" component on desktop
}

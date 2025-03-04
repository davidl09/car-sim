import { useEffect, useState, useRef, useCallback } from 'react';
import { useKeyboardControls } from '@react-three/drei';
import { isMobileDevice } from '@/utils/deviceDetection';
import { Joystick } from '../ui/Joystick';

// Define a default empty controls state
const defaultControlsState = {
  forward: false,
  back: false,
  left: false,
  right: false,
  brake: false,
  jump: false,
  cameraSwitch: false,
};

// Custom hook for desktop controls (uses KeyboardControls context)
function useDesktopControls() {
  const [, getKeyboardControls] = useKeyboardControls();
  
  return {
    getControls: getKeyboardControls,
    updateJoystickControls: () => {}, // No-op for desktop
    isMobile: false,
  };
}

// Custom hook for mobile controls (touch-based)
function useMobileControls() {
  // Store joystick controls in a ref to avoid re-renders
  const joystickControlsRef = useRef({...defaultControlsState});
  
  // Get the current controls state
  const getControls = useCallback(() => {
    return joystickControlsRef.current;
  }, []);
  
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
    isMobile: true,
    getControls,
    updateJoystickControls,
  };
}

// Factory function to get the appropriate controls hook based on device type
export function useControls() {
  const [isMobile, setIsMobile] = useState(false);
  
  // Check if using mobile device
  useEffect(() => {
    setIsMobile(isMobileDevice());
  }, []);
  
  // Use the appropriate controls based on device type
  const mobileControls = useMobileControls();
  const desktopControls = useDesktopControls();
  
  return isMobile ? mobileControls : desktopControls;
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

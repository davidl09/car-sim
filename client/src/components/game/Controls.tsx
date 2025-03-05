import { useEffect, useRef, useCallback } from 'react';
import { useKeyboardControls } from '@react-three/drei';
import { Joystick } from '../ui/Joystick';

// Define a default empty controls state
export const defaultControlsState = {
  forward: false,
  back: false,
  left: false,
  right: false,
  brake: false,
  jump: false,
  cameraSwitch: false,
};

/**
 * Desktop controls hook - ONLY use this when KeyboardControls provider is available
 * This should never be called in the mobile component tree
 */
export function useDesktopControls() {
  const [, getKeyboardControls] = useKeyboardControls();
  
  return {
    getControls: getKeyboardControls,
    updateJoystickControls: () => {}, // No-op for desktop
    isMobile: false,
  };
}

/**
 * Mobile controls hook - safe to use anywhere since it doesn't depend on React context
 */
export function useMobileControls() {
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

// Mobile Controls component - specifically for mobile devices
export function MobileControls() {
  const mobileControls = useMobileControls();
  
  return <Joystick onControlsChange={mobileControls.updateJoystickControls} />;
}

// Desktop Controls component - specifically for desktop devices
export function DesktopControls() {
  const desktopControls = useDesktopControls();
  
  // No debug logging in production
  useEffect(() => {
    // Empty effect - no logging
  }, []);
  
  return null; // This is a "headless" component on desktop
}

import { useEffect, useState, useRef, useCallback } from 'react';
import { isMobileDevice } from '../../utils/deviceDetection';
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

// IMPORTANT - This is a completely separate implementation for mobile that 
// doesn't depend on the @react-three/drei KeyboardControls at all
export const MobileControlsContext = {
  controls: { ...defaultControlsState },
  
  // Update the control state
  updateControls: (newControls: Partial<typeof defaultControlsState>) => {
    MobileControlsContext.controls = {
      ...MobileControlsContext.controls,
      ...newControls
    };
  },
  
  // Get the current control state
  getControls: () => MobileControlsContext.controls
};

// Custom keyboard event handler for desktop
function createKeyboardControlsHandler() {
  // Internal state for key presses
  const keyState = { ...defaultControlsState };
  
  // Map of keys to control actions
  const keyMap = {
    'ArrowUp': 'forward',
    'KeyW': 'forward',
    'ArrowDown': 'back',
    'KeyS': 'back',
    'ArrowLeft': 'left',
    'KeyA': 'left',
    'ArrowRight': 'right',
    'KeyD': 'right',
    'Space': 'jump',
    'ShiftLeft': 'brake',
    'ShiftRight': 'brake',
    'KeyC': 'cameraSwitch',
  } as const;
  
  // Set up event listeners
  const setupListeners = () => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const control = keyMap[e.code as keyof typeof keyMap];
      if (control) {
        keyState[control as keyof typeof keyState] = true;
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      const control = keyMap[e.code as keyof typeof keyMap];
      if (control) {
        keyState[control as keyof typeof keyState] = false;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // Return cleanup function
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  };
  
  // Get the current control state
  const getControls = () => ({ ...keyState });
  
  return {
    setupListeners,
    getControls
  };
}

// Custom hook for mobile controls (touch-based)
function useMobileControls() {
  // Get the current controls state
  const getControls = useCallback(() => {
    return MobileControlsContext.getControls();
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
    MobileControlsContext.updateControls(controls);
  }, []);
  
  return {
    isMobile: true,
    getControls,
    updateJoystickControls,
  };
}

// Custom hook for desktop using our custom keyboard handler
function useDesktopControls() {
  const keyboardHandler = useRef(createKeyboardControlsHandler());
  
  // Set up key listeners
  useEffect(() => {
    return keyboardHandler.current.setupListeners();
  }, []);
  
  return {
    isMobile: false,
    getControls: keyboardHandler.current.getControls,
    updateJoystickControls: () => {}, // No-op for desktop
  };
}

// Get appropriate controls based on device type
export function useControls() {
  const [isMobile, setIsMobile] = useState(false);
  
  // Check if using mobile device
  useEffect(() => {
    setIsMobile(isMobileDevice());
  }, []);
  
  // Create hooks for both modes
  const mobileControlsHook = useMobileControls();
  const desktopControlsHook = useDesktopControls();
  
  // Return the appropriate hook based on device
  return isMobile ? mobileControlsHook : desktopControlsHook;
}

// The Controls component renders the joystick for mobile or nothing for desktop
export function Controls() {
  const [isMobile, setIsMobile] = useState(false);
  const { updateJoystickControls } = useControls();
  
  // Check if using mobile device
  useEffect(() => {
    setIsMobile(isMobileDevice());
  }, []);
  
  // Only render joystick for mobile
  if (isMobile) {
    return <Joystick onControlsChange={updateJoystickControls} />;
  }
  
  return null; // This is a "headless" component on desktop
}

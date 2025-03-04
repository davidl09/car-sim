import { useRef, useEffect, useState, useCallback } from 'react';
import styles from './Joystick.module.css';

interface JoystickProps {
  onControlsChange: (controls: {
    forward: boolean;
    back: boolean;
    left: boolean;
    right: boolean;
    brake: boolean;
    cameraSwitch: boolean;
  }) => void;
}

export function Joystick({ onControlsChange }: JoystickProps) {
  const joystickRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [controls, setControls] = useState({
    forward: false,
    back: false,
    left: false,
    right: false,
    brake: false,
    cameraSwitch: false,
  });
  
  // Calculate the position of the knob based on touch/mouse position
  const updateKnobPosition = useCallback((clientX: number, clientY: number) => {
    if (!joystickRef.current || !knobRef.current) return;
    
    const joystickRect = joystickRef.current.getBoundingClientRect();
    const centerX = joystickRect.width / 2;
    const centerY = joystickRect.height / 2;
    
    // Calculate the position relative to the center of the joystick
    let deltaX = clientX - (joystickRect.left + centerX);
    let deltaY = clientY - (joystickRect.top + centerY);
    
    // Calculate the distance from the center
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const maxDistance = joystickRect.width / 2 - knobRef.current.clientWidth / 2;
    
    // If the distance is greater than the maximum distance, normalize the position
    if (distance > maxDistance) {
      const angle = Math.atan2(deltaY, deltaX);
      deltaX = Math.cos(angle) * maxDistance;
      deltaY = Math.sin(angle) * maxDistance;
    }
    
    // Update the knob position
    knobRef.current.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`;
    
    // Determine control states based on joystick position
    // Normalized values between -1 and 1
    const normalizedX = deltaX / maxDistance;
    const normalizedY = deltaY / maxDistance;
    
    // Threshold for considering a direction active
    const threshold = 0.3;
    
    const newControls = {
      ...controls,
      forward: normalizedY < -threshold,
      back: normalizedY > threshold,
      left: normalizedX < -threshold,
      right: normalizedX > threshold,
    };
    
    // Update the control states if they've changed
    if (JSON.stringify(newControls) !== JSON.stringify(controls)) {
      setControls(newControls);
      onControlsChange(newControls);
    }
  }, [controls, onControlsChange]);
  
  // Reset the knob position
  const resetKnobPosition = useCallback(() => {
    if (!knobRef.current) return;
    knobRef.current.style.transform = 'translate(-50%, -50%)';
    
    const newControls = {
      ...controls,
      forward: false,
      back: false,
      left: false,
      right: false,
    };
    
    setControls(newControls);
    onControlsChange(newControls);
  }, [controls, onControlsChange]);
  
  // Handle the start of dragging
  const handleStart = useCallback((clientX: number, clientY: number) => {
    setIsDragging(true);
    updateKnobPosition(clientX, clientY);
  }, [updateKnobPosition]);
  
  // Handle the movement during dragging
  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging) return;
    updateKnobPosition(clientX, clientY);
  }, [isDragging, updateKnobPosition]);
  
  // Handle the end of dragging
  const handleEnd = useCallback(() => {
    setIsDragging(false);
    resetKnobPosition();
  }, [resetKnobPosition]);
  
  // Handle brake button press
  const handleBrakeStart = useCallback(() => {
    const newControls = { ...controls, brake: true };
    setControls(newControls);
    onControlsChange(newControls);
  }, [controls, onControlsChange]);
  
  // Handle brake button release
  const handleBrakeEnd = useCallback(() => {
    const newControls = { ...controls, brake: false };
    setControls(newControls);
    onControlsChange(newControls);
  }, [controls, onControlsChange]);
  
  // Handle camera button press
  const handleCameraSwitch = useCallback(() => {
    // Temporarily set camera switch to true
    const newControls = { ...controls, cameraSwitch: true };
    setControls(newControls);
    onControlsChange(newControls);
    
    // Reset camera switch after 100ms
    setTimeout(() => {
      const resetControls = { ...controls, cameraSwitch: false };
      setControls(resetControls);
      onControlsChange(resetControls);
    }, 100);
  }, [controls, onControlsChange]);
  
  // Set up event listeners for touch and mouse events
  useEffect(() => {
    const joystick = joystickRef.current;
    if (!joystick) return;
    
    // Touch event handlers
    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      handleStart(touch.clientX, touch.clientY);
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    };
    
    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      handleEnd();
    };
    
    // Mouse event handlers
    const handleMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      handleStart(e.clientX, e.clientY);
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      handleMove(e.clientX, e.clientY);
    };
    
    const handleMouseUp = (e: MouseEvent) => {
      e.preventDefault();
      handleEnd();
    };
    
    // Add touch event listeners
    joystick.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    // Add mouse event listeners
    joystick.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    // Cleanup
    return () => {
      // Remove touch event listeners
      joystick.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      
      // Remove mouse event listeners
      joystick.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleStart, handleMove, handleEnd]);
  
  return (
    <>
      {/* Joystick for steering (left/right) */}
      <div className={styles.joystickContainer} ref={joystickRef}>
        <div className={styles.joystickKnob} ref={knobRef}></div>
      </div>
      
      {/* Throttle controls (forward/back) */}
      <div className={styles.throttleContainer}>
        <button 
          className={styles.throttleUp}
          onTouchStart={() => {
            const newControls = { ...controls, forward: true };
            setControls(newControls);
            onControlsChange(newControls);
          }}
          onTouchEnd={() => {
            const newControls = { ...controls, forward: false };
            setControls(newControls);
            onControlsChange(newControls);
          }}
          onMouseDown={() => {
            const newControls = { ...controls, forward: true };
            setControls(newControls);
            onControlsChange(newControls);
          }}
          onMouseUp={() => {
            const newControls = { ...controls, forward: false };
            setControls(newControls);
            onControlsChange(newControls);
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M7 14l5-5 5 5z" />
          </svg>
        </button>
        
        <button 
          className={styles.throttleDown}
          onTouchStart={() => {
            const newControls = { ...controls, back: true };
            setControls(newControls);
            onControlsChange(newControls);
          }}
          onTouchEnd={() => {
            const newControls = { ...controls, back: false };
            setControls(newControls);
            onControlsChange(newControls);
          }}
          onMouseDown={() => {
            const newControls = { ...controls, back: true };
            setControls(newControls);
            onControlsChange(newControls);
          }}
          onMouseUp={() => {
            const newControls = { ...controls, back: false };
            setControls(newControls);
            onControlsChange(newControls);
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M7 10l5 5 5-5z" />
          </svg>
        </button>
      </div>
      
      {/* Brake button */}
      <button 
        className={styles.brakeButton}
        onTouchStart={handleBrakeStart}
        onTouchEnd={handleBrakeEnd}
        onMouseDown={handleBrakeStart}
        onMouseUp={handleBrakeEnd}
      >
        BRAKE
      </button>
      
      {/* Camera switch button */}
      <button 
        className={styles.cameraButton}
        onClick={handleCameraSwitch}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <path d="M9.5 6.5v3h-3v-3h3M11 5H5v6h6V5zm-1.5 9.5v3h-3v-3h3M11 13H5v6h6v-6zm6.5-6.5v3h-3v-3h3M19 5h-6v6h6V5zm-6 8h1.5v1.5H13V13zm1.5 1.5H16V16h-1.5v-1.5zM16 13h1.5v1.5H16V13zm-3 3h1.5v1.5H13V16zm1.5 1.5H16V19h-1.5v-1.5zM16 16h1.5v1.5H16V16zm1.5-1.5H19V16h-1.5v-1.5zm0 3H19V19h-1.5v-1.5zM21 7v12c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V7c0-1.1.9-2 2-2h1V3h2v2h8V3h2v2h1c1.1 0 2 .9 2 2z" />
        </svg>
      </button>
    </>
  );
}
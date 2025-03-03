import React, { useRef, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import '@/styles/SpeedDial.css';

// Constants for dial
const SPEED_MULTIPLIER = 200; // Convert internal speed units to km/h
const MAX_SPEED = 200; // Maximum speed on the dial in km/h
const MIN_ANGLE = -215; // Start angle of the dial (in degrees)
const MAX_ANGLE = 45; // End angle of the dial (in degrees)
const TOTAL_ANGLE = MAX_ANGLE - MIN_ANGLE;

export function SpeedDial() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const speedRef = useRef<number>(0);
  
  // Get player data from the game store
  const playerId = useGameStore((state) => state.playerId);
  const player = useGameStore((state) => 
    playerId ? state.players[playerId] : null
  );
  
  // Calculate current speed
  const currentSpeed = React.useMemo(() => {
    if (!player) return 0;
    
    // Calculate magnitude of velocity
    const velocity = player.velocity;
    const speedMagnitude = Math.sqrt(
      velocity.x * velocity.x + 
      velocity.y * velocity.y + 
      velocity.z * velocity.z
    );
    
    // Convert to km/h for display
    return speedMagnitude * SPEED_MULTIPLIER;
  }, [player]);
  
  // Smooth the speed changes for more realistic dial movement
  useEffect(() => {
    let animationFrameId: number;
    
    const updateSpeedWithEasing = () => {
      // Always update the speed to the current value with easing
      // This ensures the needle goes both up AND down
      const diff = currentSpeed - speedRef.current;
      
      // Apply smoother easing with different rates for acceleration vs deceleration
      if (Math.abs(diff) < 0.1) {
        // Snap to exact value when very close
        speedRef.current = currentSpeed;
      } else if (diff > 0) {
        // Accelerating - quicker response
        speedRef.current += diff * 0.15;
      } else {
        // Decelerating - slightly slower response for realistic momentum
        speedRef.current += diff * 0.1;
      }
      
      drawSpeedDial();
      animationFrameId = requestAnimationFrame(updateSpeedWithEasing);
    };
    
    // Start the animation loop
    animationFrameId = requestAnimationFrame(updateSpeedWithEasing);
    
    // Proper cleanup of animation frame
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [currentSpeed]);
  
  // Draw the speed dial
  const drawSpeedDial = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Ensure correct canvas size and resolution
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    
    const width = rect.width;
    const height = rect.height;
    const centerX = width / 2;
    const centerY = height * 0.65; // Position the center toward the bottom
    const radius = Math.min(width, height) * 0.4;
    
    // Convert speed to angle
    const speedRatio = Math.min(speedRef.current / MAX_SPEED, 1);
    const needleAngle = (MIN_ANGLE + (TOTAL_ANGLE * speedRatio)) * Math.PI / 180;
    
    // Draw the outer dial
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, (MIN_ANGLE * Math.PI / 180), (MAX_ANGLE * Math.PI / 180), false);
    ctx.lineWidth = 10;
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
    ctx.stroke();
    
    // Draw speed markers
    for (let i = 0; i <= 10; i++) {
      const markerAngle = (MIN_ANGLE + (TOTAL_ANGLE * i / 10)) * Math.PI / 180;
      const startX = centerX + (radius - 15) * Math.cos(markerAngle);
      const startY = centerY + (radius - 15) * Math.sin(markerAngle);
      const endX = centerX + radius * Math.cos(markerAngle);
      const endY = centerY + radius * Math.sin(markerAngle);
      
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'white';
      ctx.stroke();
      
      // Add text for major divisions
      if (i % 2 === 0) {
        const textX = centerX + (radius - 30) * Math.cos(markerAngle);
        const textY = centerY + (radius - 30) * Math.sin(markerAngle);
        
        ctx.save();
        ctx.translate(textX, textY);
        ctx.rotate(markerAngle + Math.PI/2);
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText((i * MAX_SPEED / 10).toString(), 0, 0);
        ctx.restore();
      }
    }
    
    // Draw the filled portion
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, (MIN_ANGLE * Math.PI / 180), needleAngle, false);
    ctx.lineWidth = 10;
    
    // Color gradient based on speed
    let gradientColor;
    if (speedRef.current < MAX_SPEED * 0.5) {
      gradientColor = '#4CAF50'; // Green
    } else if (speedRef.current < MAX_SPEED * 0.8) {
      gradientColor = '#FFC107'; // Yellow
    } else {
      gradientColor = '#F44336'; // Red
    }
    
    ctx.strokeStyle = gradientColor;
    ctx.stroke();
    
    // Draw needle
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    const needleLength = radius - 5;
    ctx.lineTo(
      centerX + needleLength * Math.cos(needleAngle),
      centerY + needleLength * Math.sin(needleAngle)
    );
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#FF0000';
    ctx.stroke();
    
    // Draw center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 10, 0, 2 * Math.PI, false);
    ctx.fillStyle = '#333';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.stroke();
    
    // Draw current speed text
    ctx.fillStyle = 'white';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(Math.round(speedRef.current).toString(), centerX, centerY + 50);
    
    // Draw unit text
    ctx.font = '14px Arial';
    ctx.fillText('km/h', centerX, centerY + 70);
  };
  
  return (
    <div className="speed-dial-container">
      <canvas ref={canvasRef} className="speed-dial-canvas" />
    </div>
  );
}

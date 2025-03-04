/**
 * Utility functions for detecting device types
 */

/**
 * Checks if the current device is a mobile device
 * @returns true if the device is mobile, false otherwise
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check for mobile user agent patterns
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  
  // Regex pattern to match common mobile device identifiers
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  
  // Alternative check using window.orientation which is only defined on mobile devices
  const hasOrientation = typeof window.orientation !== 'undefined';
  
  // Check for touch capabilities
  const hasTouch = 'ontouchstart' in window || 
                  navigator.maxTouchPoints > 0 ||
                  (navigator as any).msMaxTouchPoints > 0;
  
  return mobileRegex.test(userAgent) || hasOrientation || hasTouch;
}
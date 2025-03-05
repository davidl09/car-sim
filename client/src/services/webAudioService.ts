/**
 * WebAudioService - A more efficient implementation for engine sounds
 * Uses the Web Audio API directly for better performance and more precise control
 * Optimized for mobile performance with lazy loading
 */
class WebAudioService {
  private audioContext: AudioContext | null = null;
  private engineNode: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private engineBuffer: AudioBuffer | null = null;
  private isInitialized: boolean = false;
  private isPlaying: boolean = false;
  private currentSpeed: number = 0;
  private masterVolume: number = 0.5;
  private loadPromise: Promise<void> | null = null;
  private isMobile: boolean = false;
  
  constructor() {
    // Check if we're on mobile
    this.isMobile = this.detectMobileDevice();
    
    // Don't initialize immediately - wait for explicit initialization call
  }

  // Detect if we're on a mobile device for optimizations
  private detectMobileDevice(): boolean {
    if (typeof window === 'undefined') return false;
    
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  }
  
  // Initialize audio context only when explicitly called
  public init(): Promise<void> {
    // If already initialized or initializing, return existing promise
    if (this.isInitialized || this.loadPromise) {
      return this.loadPromise || Promise.resolve();
    }
    
    try {
      // Create audio context only when needed
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Start loading the engine sound
      return this.loadEngineSound();
    } catch (error) {
      console.error("Failed to initialize WebAudioService", error);
      return Promise.resolve();
    }
  }

  public async loadEngineSound(): Promise<void> {
    if (!this.audioContext) {
      return Promise.resolve();
    }
    
    if (this.loadPromise) {
      return this.loadPromise;
    }
    
    this.loadPromise = new Promise(async (resolve) => {
      try {
        // For mobile, use a much simpler, shorter engine sound buffer to improve performance
        if (this.isMobile) {
          this.createSimpleEngineSound();
          this.isInitialized = true;
          resolve();
          return;
        }
        
        try {
          // Try to load actual sound file
          const response = await fetch('/audio/engine-loop.mp3');
          if (!response.ok) {
            throw new Error('Failed to load engine sound');
          }
          
          const arrayBuffer = await response.arrayBuffer();
          this.engineBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
          this.isInitialized = true;
          resolve();
        } catch (error) {
          // Fallback to simplified engine sound
          this.createSimpleEngineSound();
          this.isInitialized = true;
          resolve();
        }
      } catch (error) {
        // Final fallback - create the most basic sound possible
        this.createFallbackSound();
        this.isInitialized = true;
        resolve();
      }
    });
    
    return this.loadPromise;
  }
  
  // Creates a simplified engine sound - optimized for performance
  private createSimpleEngineSound(): void {
    if (!this.audioContext) return;
    
    // Use a much shorter buffer for mobile to reduce memory usage
    const duration = this.isMobile ? 0.5 : 1.0; // shorter on mobile
    const sampleRate = this.audioContext.sampleRate;
    const bufferSize = Math.floor(sampleRate * duration);
    const buffer = this.audioContext.createBuffer(1, bufferSize, sampleRate); // Mono on mobile
    
    // Get the buffer data
    const channelData = buffer.getChannelData(0);
    
    // Use a simplified algorithm with fewer calculations
    const frequency = 50; // Base frequency
    const step = (2 * Math.PI * frequency) / sampleRate;
    
    // Generate the samples - only one sine wave instead of three
    for (let i = 0; i < bufferSize; i++) {
      channelData[i] = Math.sin(i * step) * 0.5;
    }
    
    this.engineBuffer = buffer;
  }
  
  // Ultimate fallback - creates a tiny buffer with minimal CPU usage
  private createFallbackSound(): void {
    if (!this.audioContext) return;
    
    // Create the smallest possible buffer that will still loop
    const sampleRate = this.audioContext.sampleRate;
    const bufferSize = Math.floor(sampleRate * 0.1); // 100ms buffer
    const buffer = this.audioContext.createBuffer(1, bufferSize, sampleRate);
    
    // Fill with a basic tone
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      channelData[i] = Math.sin(i * 0.1) * 0.3;
    }
    
    this.engineBuffer = buffer;
  }

  public startEngine(): Promise<void> {
    // Initialize audio system if needed
    if (!this.isInitialized) {
      return this.init().then(() => this.startEngineSound());
    } else {
      this.startEngineSound();
      return Promise.resolve();
    }
  }
  
  private startEngineSound(): void {
    // Skip if already playing or missing resources
    if (!this.audioContext || !this.engineBuffer || this.isPlaying) {
      return;
    }
    
    try {
      // Need to resume AudioContext on user interaction
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      
      // Reuse existing gain node if possible
      if (!this.gainNode) {
        this.gainNode = this.audioContext.createGain();
        this.gainNode.connect(this.audioContext.destination);
      }
      
      // Set initial volume (lower on mobile)
      const initialVolume = this.isMobile ? 0.15 : 0.2;
      this.gainNode.gain.value = initialVolume * this.masterVolume;
      
      // Create source node
      this.engineNode = this.audioContext.createBufferSource();
      this.engineNode.buffer = this.engineBuffer;
      this.engineNode.loop = true;
      
      // Set initial playback rate (lower on mobile for better performance)
      this.engineNode.playbackRate.value = this.isMobile ? 0.5 : 0.6;
      
      // Connect and start
      this.engineNode.connect(this.gainNode);
      this.engineNode.start(0);
      this.isPlaying = true;
      
      // Simplified cleanup handler
      this.engineNode.onended = () => {
        this.isPlaying = false;
        if (this.engineNode) {
          this.engineNode = null;
        }
      };
    } catch (error) {
      // Reset state on error
      this.isPlaying = false;
      console.error("Failed to start engine sound:", error);
    }
  }

  // Track last update time for throttling updates on mobile
  private lastUpdateTime: number = 0;
  
  public updateEngineSound(speed: number): void {
    if (!this.isPlaying || !this.audioContext || !this.engineNode || !this.gainNode) {
      this.currentSpeed = speed;
      return;
    }
    
    // Store current speed
    this.currentSpeed = speed;
    
    // On mobile, throttle updates to reduce CPU usage
    const now = performance.now();
    if (this.isMobile && now - this.lastUpdateTime < 100) { // Only update every 100ms on mobile
      return;
    }
    this.lastUpdateTime = now;
    
    try {
      // Simpler calculation for mobile devices
      if (this.isMobile) {
        this.updateEngineSimple(speed);
        return;
      }
      
      // Desktop gets the full experience with smooth transitions
      this.updateEngineDetailed(speed);
    } catch (error) {
      // Error updating engine sound - fail silently
    }
  }
  
  // Simplified engine sound updates for mobile
  private updateEngineSimple(speed: number): void {
    if (!this.engineNode || !this.gainNode || !this.audioContext) return;
    
    // Simplified calculation with fewer operations
    const normalizedSpeed = Math.min(speed / 200, 1);
    
    // Direct value setting without transitions - more efficient
    this.engineNode.playbackRate.value = 0.5 + normalizedSpeed;
    this.gainNode.gain.value = (0.2 + normalizedSpeed * 0.5) * this.masterVolume;
  }
  
  // Detailed engine sound updates for desktop
  private updateEngineDetailed(speed: number): void {
    if (!this.engineNode || !this.gainNode || !this.audioContext) return;
    
    // More detailed calculation with transitions
    const minSpeedValue = 0.5;
    const effectiveSpeed = Math.max(speed, minSpeedValue);
    const maxSpeedKmh = 200;
    
    const speedFactor = (effectiveSpeed - minSpeedValue) / (maxSpeedKmh - minSpeedValue);
    const normalizedSpeed = Math.max(0, Math.min(speedFactor, 1));
    
    const minRate = 0.5;
    const maxRate = 2.0;
    const newRate = minRate + normalizedSpeed * (maxRate - minRate);
    
    const minVolume = 0.15;
    const maxVolume = 0.85;
    const newVolume = (minVolume + normalizedSpeed * (maxVolume - minVolume)) * this.masterVolume;
    
    // Smooth transitions using the Web Audio API
    const currentTime = this.audioContext.currentTime;
    const transitionTime = 0.05;
    
    this.engineNode.playbackRate.linearRampToValueAtTime(newRate, currentTime + transitionTime);
    this.gainNode.gain.linearRampToValueAtTime(newVolume, currentTime + transitionTime);
  }

  public stopEngine(): void {
    this.cleanupAudio();
  }
  
  private cleanupAudio(): void {
    if (!this.isPlaying) return;
    
    try {
      if (this.engineNode) {
        this.engineNode.stop();
        this.engineNode.disconnect();
        this.engineNode = null;
      }
      
      // Keep the gain node for reuse
      this.isPlaying = false;
    } catch (error) {
      // Reset state on error
      this.isPlaying = false;
    }
  }
  
  public setVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    
    // Apply volume change immediately if playing
    if (this.isPlaying && this.gainNode) {
      if (this.isMobile) {
        // Simple volume adjustment for mobile
        this.gainNode.gain.value = 0.3 * this.masterVolume;
      } else {
        // More nuanced volume change for desktop
        const normalizedSpeed = Math.min(this.currentSpeed / 200, 1);
        const volume = (0.2 + normalizedSpeed * 0.5) * this.masterVolume;
        this.gainNode.gain.value = volume;
      }
    }
  }
  
  // Get the current init state
  public isReady(): boolean {
    return this.isInitialized;
  }
  
  // Get audio context for other sound effects
  public getAudioContext(): AudioContext | null {
    return this.audioContext;
  }
}

// Create a singleton instance
export const webAudioService = new WebAudioService();

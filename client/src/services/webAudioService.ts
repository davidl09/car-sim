/**
 * WebAudioService - A more efficient implementation for engine sounds
 * Uses the Web Audio API directly for better performance and more precise control
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
  
  constructor() {
    this.init();
  }

  private init(): void {
    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log('WebAudioService initialized');
      
      // Pre-load the engine sound
      this.loadEngineSound();
    } catch (error) {
      console.error('Failed to initialize WebAudioService:', error);
    }
  }

  public async loadEngineSound(): Promise<void> {
    if (!this.audioContext) {
      console.warn('Audio context not available');
      return Promise.resolve();
    }
    
    if (this.loadPromise) {
      return this.loadPromise;
    }
    
    this.loadPromise = new Promise(async (resolve, /*reject*/) => {
      try {
        // Create empty buffer for now (in case file not available)
        // We know audioContext exists here because we checked at the beginning
        console.log('Creating audio buffer with sample rate:', this.audioContext!.sampleRate);
        
        const sampleRate = this.audioContext!.sampleRate;
        const emptyBuffer = this.audioContext!.createBuffer(2, sampleRate * 2, sampleRate);
        this.engineBuffer = emptyBuffer;
        
        // Try to load actual sound file
        const response = await fetch('/audio/engine-loop.mp3');
        if (!response.ok) {
          console.warn('Engine sound file not found, using synthetic sound');
          this.createSyntheticEngineSound();
          resolve();
          return;
        }
        
        const arrayBuffer = await response.arrayBuffer();
        // We know audioContext exists here because we checked at the beginning
        this.engineBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
        console.log('Successfully decoded audio data, buffer length:', this.engineBuffer.length);
        this.isInitialized = true;
        resolve();
      } catch (error) {
        console.warn('Failed to load engine sound, using synthetic sound:', error);
        this.createSyntheticEngineSound();
        resolve();
      }
    });
    
    return this.loadPromise;
  }
  
  private createSyntheticEngineSound(): void {
    if (!this.audioContext) {
      console.warn('Cannot create synthetic sound, audio context is null');
      return;
    }
    
    // Create a synthetic engine sound as a backup
    console.log('Creating synthetic engine sound');
    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(2, sampleRate * 2, sampleRate);
    
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < channelData.length; i++) {
        // Create a simple repeating pattern that sounds engine-like
        channelData[i] = 
          (Math.sin(i * 0.01) * 0.5) + 
          (Math.sin(i * 0.02) * 0.3) + 
          (Math.sin(i * 0.05) * 0.1);
      }
    }
    
    this.engineBuffer = buffer;
    this.isInitialized = true;
  }

  public startEngine(): void {
    if (!this.isInitialized) {
      this.loadEngineSound().then(() => this.startEngineSound());
    } else {
      this.startEngineSound();
    }
  }
  
  private startEngineSound(): void {
    console.log('Starting engine sound with state:', {
      hasContext: !!this.audioContext,
      hasBuffer: !!this.engineBuffer,
      isInitialized: this.isInitialized,
      isPlaying: this.isPlaying
    });
    
    if (!this.audioContext || !this.engineBuffer || this.isPlaying) {
      console.warn('Cannot start engine sound, prerequisites not met');
      return;
    }
    
    try {
      // Need to resume AudioContext on user interaction
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      
      // Create gain node for volume control
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 0.2 * this.masterVolume; // Start with idle volume
      this.gainNode.connect(this.audioContext.destination);
      
      // Create and configure source node
      this.engineNode = this.audioContext.createBufferSource();
      this.engineNode.buffer = this.engineBuffer;
      this.engineNode.loop = true;
      
      // Set initial playback rate (idle speed)
      this.engineNode.playbackRate.value = 0.6;
      
      // Connect and start
      this.engineNode.connect(this.gainNode);
      this.engineNode.start(0);
      this.isPlaying = true;
      
      console.log('Engine sound started');
      
      // If engine gets ended somehow, clean up
      this.engineNode.onended = () => {
        this.isPlaying = false;
        this.cleanupAudio();
      };
    } catch (error) {
      console.error('Failed to start engine sound:', error);
    }
  }

  public updateEngineSound(speed: number): void {
    if (!this.isPlaying || !this.audioContext || !this.engineNode || !this.gainNode) {
      this.currentSpeed = speed;
      // Only log once in a while to avoid console spam
      if (Math.random() < 0.01) {
        console.log('Engine sound update skipped, state:', {
          isPlaying: this.isPlaying,
          hasContext: !!this.audioContext,
          hasNode: !!this.engineNode,
          hasGain: !!this.gainNode,
          speed: speed
        });
      }
      return;
    }
    
    // Store current speed
    this.currentSpeed = speed;
    
    try {
      // Ensure a minimum value for idle sound when stationary
      const minSpeedValue = 0.5; // Minimum to ensure we have sound at idle
      
      // Always use at least the minimum speed value for a baseline engine sound
      // This gives us our idle sound when the car isn't moving
      const effectiveSpeed = Math.max(speed, minSpeedValue);
      
      // Scale sound over the full speed range (0-200 km/h)
      // This ensures we use the full sound range and don't max out too early
      const maxSpeedKmh = 200; // Our new max speed
      
      // Linear scaling factor from 0 to 1 over the entire speed range
      const speedFactor = (effectiveSpeed - minSpeedValue) / (maxSpeedKmh - minSpeedValue);
      
      // Ensure we're always in the 0-1 range
      const normalizedSpeed = Math.max(0, Math.min(speedFactor, 1));
      
      // Calculate new playback rate with wider range
      const minRate = 0.5;  // Lower idle sound
      const maxRate = 2.0;  // Higher top-end sound
      const newRate = minRate + normalizedSpeed * (maxRate - minRate);
      
      // Calculate new volume with more variation
      const minVolume = 0.15; // Quieter at idle
      const maxVolume = 0.85; // Louder at max speed
      const newVolume = (minVolume + normalizedSpeed * (maxVolume - minVolume)) * this.masterVolume;
      
      // Set new parameters using the AudioParam API for smooth transitions
      const currentTime = this.audioContext.currentTime;
      
      // Shorter transition time for more responsive sound changes
      const transitionTime = 0.05; // Faster response (was 0.1)
      
      // Update playback rate with slight ramp for smoothness
      this.engineNode.playbackRate.cancelScheduledValues(currentTime);
      this.engineNode.playbackRate.setValueAtTime(this.engineNode.playbackRate.value, currentTime);
      this.engineNode.playbackRate.linearRampToValueAtTime(newRate, currentTime + transitionTime);
      
      // Update volume with slight ramp for smoothness
      this.gainNode.gain.cancelScheduledValues(currentTime);
      this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, currentTime);
      this.gainNode.gain.linearRampToValueAtTime(newVolume, currentTime + transitionTime);
    } catch (error) {
      console.error('Error updating engine sound:', error);
    }
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
      
      if (this.gainNode) {
        this.gainNode.disconnect();
        this.gainNode = null;
      }
      
      this.isPlaying = false;
    } catch (error) {
      console.error('Error cleaning up audio:', error);
    }
  }
  
  public setVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    
    // Apply volume change immediately if playing
    if (this.isPlaying && this.gainNode) {
      const normalizedSpeed = Math.min(this.currentSpeed / 30, 1);
      const minVolume = 0.2;
      const maxVolume = 0.7;
      const newVolume = (minVolume + normalizedSpeed * (maxVolume - minVolume)) * this.masterVolume;
      
      this.gainNode.gain.value = newVolume;
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

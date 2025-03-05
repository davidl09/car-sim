import { webAudioService } from './webAudioService';

// A simple audio service to manage game sounds - optimized for mobile
class AudioService {
  private engineRunning: boolean = false;
  private engineVolume: number = 0.5; // Default volume
  private pendingAutoplayRequest: boolean = false;
  private userInteracted: boolean = false;
  private lastCollisionSound: number = 0; // Timestamp of last collision sound
  private audioInitialized: boolean = false;
  private initPromise: Promise<void> | null = null;
  private isMobile: boolean = false;
  
  constructor() {
    // Check if we're on a mobile device
    this.isMobile = this.detectMobileDevice();
    
    // Set up event listeners for user interaction
    this.setupAutoplayHandling();
  }
  
  // Detect if we're on a mobile device
  private detectMobileDevice(): boolean {
    if (typeof window === 'undefined') return false;
    
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  }
  
  // Setup handlers for autoplay
  private setupAutoplayHandling(): void {
    // Track user interaction to enable audio
    const userInteractionEvents = ['click', 'touchstart', 'keydown'];
    
    const handleUserInteraction = () => {
      if (this.userInteracted) return;
      
      this.userInteracted = true;
      
      // Try to initialize audio on first interaction
      this.initAudio().then(() => {
        // Start engine if it was requested
        if (this.pendingAutoplayRequest) {
          this.pendingAutoplayRequest = false;
          this.startEngine();
        }
      });
      
      // Remove event listeners after first interaction
      userInteractionEvents.forEach(eventType => {
        document.removeEventListener(eventType, handleUserInteraction);
      });
    };
    
    // Add event listeners for user interaction
    userInteractionEvents.forEach(eventType => {
      document.addEventListener(eventType, handleUserInteraction, { once: false });
    });
  }
  
  // Initialize audio system - only called after user interaction
  public initAudio(): Promise<void> {
    if (this.audioInitialized) {
      return Promise.resolve();
    }
    
    if (this.initPromise) {
      return this.initPromise;
    }
    
    // Initialize the WebAudioService
    this.initPromise = webAudioService.init()
      .then(() => {
        this.audioInitialized = true;
        return Promise.resolve();
      })
      .catch(error => {
        console.error("Failed to initialize audio:", error);
        return Promise.resolve();
      });
    
    return this.initPromise;
  }
  
  // Start engine sound
  public startEngine(): Promise<void> {
    if (!this.userInteracted) {
      this.pendingAutoplayRequest = true;
      return Promise.resolve();
    }
    
    if (!this.audioInitialized) {
      return this.initAudio().then(() => this.startEngine());
    }
    
    if (!this.engineRunning) {
      this.engineRunning = true;
      return webAudioService.startEngine();
    }
    
    return Promise.resolve();
  }
  
  // Check if engine is running
  public isEngineRunning(): boolean {
    return this.engineRunning;
  }
  
  // Stop engine sound
  public stopEngine(): void {
    this.pendingAutoplayRequest = false;
    
    if (this.engineRunning) {
      webAudioService.stopEngine();
      this.engineRunning = false;
    }
  }
  
  // Update engine sound based on speed
  public updateEngineSound(speed: number): void {
    // Skip if engine isn't running
    if (!this.engineRunning || !this.audioInitialized) return;
    
    // Use the optimized WebAudioService 
    webAudioService.updateEngineSound(speed);
  }
  
  // Set master engine volume (0-1)
  public setEngineVolume(volume: number): void {
    this.engineVolume = Math.max(0, Math.min(1, volume));
    
    // Only update if audio is initialized
    if (this.audioInitialized) {
      webAudioService.setVolume(this.engineVolume);
    }
  }
  
  // Collision sound handling - optimized for mobile
  private collisionSoundActive = false;
  private collisionOscillator: OscillatorNode | null = null;
  private collisionGain: GainNode | null = null;
  
  // Play collision sound with throttling
  public playCollisionSound(): void {
    // Skip if audio not initialized
    if (!this.audioInitialized) return;
    
    // Increased throttling on mobile devices
    const minInterval = this.isMobile ? 500 : 300; // 500ms on mobile, 300ms on desktop
    
    // Throttle collision sounds to prevent too many at once
    const now = Date.now();
    if (now - this.lastCollisionSound < minInterval) return;
    this.lastCollisionSound = now;
    
    // Get audio context
    const context = webAudioService.getAudioContext();
    if (!context) return;
    
    // If we're already playing a collision sound, don't create a new one
    if (this.collisionSoundActive) return;
    
    try {
      // On mobile, use a simpler collision sound
      if (this.isMobile) {
        this.playSimpleCollisionSound(context);
      } else {
        this.playDetailedCollisionSound(context);
      }
    } catch (e) {
      // Reset state on error
      this.collisionSoundActive = false;
    }
  }
  
  // Simplified collision sound for mobile devices
  private playSimpleCollisionSound(context: AudioContext): void {
    // Very simple sound with minimal processing
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    
    // Simple connect
    oscillator.connect(gain);
    gain.connect(context.destination);
    
    // Basic settings without transitions
    oscillator.type = 'sine'; // Simpler waveform for mobile
    oscillator.frequency.value = 80;
    
    // Simple volume 
    gain.gain.value = this.engineVolume * 0.5;
    
    // Very short sound for mobile
    this.collisionSoundActive = true;
    
    // Play sound
    oscillator.start();
    oscillator.stop(context.currentTime + 0.15); // Shorter duration on mobile
    
    // Clean up after sound ends
    oscillator.onended = () => {
      gain.disconnect();
      this.collisionSoundActive = false;
    };
  }
  
  // More detailed collision sound for desktop
  private playDetailedCollisionSound(context: AudioContext): void {
    // Create nodes if needed
    if (!this.collisionOscillator || !this.collisionGain) {
      this.collisionOscillator = context.createOscillator();
      this.collisionGain = context.createGain();
      
      // Connect nodes
      this.collisionOscillator.connect(this.collisionGain);
      this.collisionGain.connect(context.destination);
    }
    
    // Set up oscillator with frequency sweep
    this.collisionOscillator.type = 'sawtooth';
    this.collisionOscillator.frequency.setValueAtTime(120, context.currentTime);
    this.collisionOscillator.frequency.exponentialRampToValueAtTime(40, context.currentTime + 0.2);
    
    // Set up gain envelope
    this.collisionGain.gain.setValueAtTime(this.engineVolume, context.currentTime);
    this.collisionGain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.3);
    
    // Mark as active
    this.collisionSoundActive = true;
    
    // Play sound
    this.collisionOscillator.start(context.currentTime);
    this.collisionOscillator.stop(context.currentTime + 0.3);
    
    // Handle completion
    this.collisionOscillator.onended = () => {
      this.collisionSoundActive = false;
      
      // Recreate oscillator for next use
      if (context) {
        this.collisionOscillator = context.createOscillator();
        this.collisionOscillator.connect(this.collisionGain!);
      }
    };
  }
}

// Create a singleton instance
export const audioService = new AudioService();

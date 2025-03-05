import { webAudioService } from './webAudioService';

// A simple audio service to manage game sounds
class AudioService {
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private engineRunning: boolean = false;
  private engineVolume: number = 0.5; // Default volume
  private pendingAutoplayRequest: boolean = false;
  private userInteracted: boolean = false;
  private lastCollisionSound: number = 0; // Timestamp of last collision sound
  
  constructor() {
    this.setupAutoplayHandling();
  }
  
  // Setup handlers for autoplay
  private setupAutoplayHandling(): void {
    // Track user interaction to enable audio
    const userInteractionEvents = ['click', 'touchstart', 'keydown'];
    
    const handleUserInteraction = () => {
      if (this.userInteracted) return;
      
      this.userInteracted = true;
      
      // Try to play engine if it was requested but prevented
      if (this.pendingAutoplayRequest) {
        this.pendingAutoplayRequest = false;
        this.startEngine();
      }
      
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
  
  // Start engine sound
  public startEngine(): void {
    if (!this.userInteracted) {
      this.pendingAutoplayRequest = true;
      return;
    }
    
    if (!this.engineRunning) {
      this.engineRunning = true;
      webAudioService.startEngine();
    }
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
    if (!this.engineRunning) return;
    
    // Use the more efficient WebAudioService for sound updating
    webAudioService.updateEngineSound(speed);
  }
  
  // Set master engine volume (0-1)
  public setEngineVolume(volume: number): void {
    this.engineVolume = Math.max(0, Math.min(1, volume));
    
    // Use WebAudioService to update volume
    webAudioService.setVolume(this.engineVolume);
  }
  
  // Play a one-shot sound
  public playSound(name: string): void {
    if (!this.userInteracted) {
      return;
    }
    
    const sound = this.sounds.get(name);
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(() => {
        // Sound play prevented
      });
    }
  }
  
  // Cached oscillator nodes for collision sounds to prevent memory leaks
  private collisionOscillator: OscillatorNode | null = null;
  private collisionGain: GainNode | null = null;
  private collisionSoundActive = false;
  
  // Play collision sound
  public playCollisionSound(): void {
    // Throttle collision sounds to prevent too many at once
    const now = Date.now();
    if (now - this.lastCollisionSound < 300) return;
    
    this.lastCollisionSound = now;
    
    // Get audio context
    const context = webAudioService.getAudioContext();
    if (!context) return;
    
    // If we're already playing a collision sound, don't create a new one
    if (this.collisionSoundActive) return;
    
    // Create/reuse audio nodes
    if (!this.collisionOscillator || !this.collisionGain) {
      this.collisionOscillator = context.createOscillator();
      this.collisionGain = context.createGain();
      
      // Connect nodes once
      this.collisionOscillator.connect(this.collisionGain);
      this.collisionGain.connect(context.destination);
    }
    
    // Set up oscillator
    this.collisionOscillator.type = 'sawtooth';
    this.collisionOscillator.frequency.cancelScheduledValues(context.currentTime);
    this.collisionOscillator.frequency.setValueAtTime(120, context.currentTime);
    this.collisionOscillator.frequency.exponentialRampToValueAtTime(40, context.currentTime + 0.2);
    
    // Set up gain node for volume envelope
    this.collisionGain.gain.cancelScheduledValues(context.currentTime);
    this.collisionGain.gain.setValueAtTime(this.engineVolume, context.currentTime);
    this.collisionGain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.3);
    
    // Mark as active
    this.collisionSoundActive = true;
    
    try {
      // Start the oscillator
      this.collisionOscillator.start(context.currentTime);
      
      // Stop the oscillator after sound completes
      this.collisionOscillator.stop(context.currentTime + 0.3);
      
      // Handle completion - reset for next use
      this.collisionOscillator.onended = () => {
        this.collisionSoundActive = false;
        // Recreate oscillator for next use (since they can't be restarted)
        this.collisionOscillator = context.createOscillator();
        this.collisionOscillator.connect(this.collisionGain!);
      };
    } catch (e) {
      // Handle any errors with sound playback
      this.collisionSoundActive = false;
    }
  }
}

// Create a singleton instance
export const audioService = new AudioService();

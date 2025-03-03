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
      console.log('User interacted, enabling audio');
      
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
      console.log('Delaying engine start until user interacts');
      this.pendingAutoplayRequest = true;
      return;
    }
    
    if (!this.engineRunning) {
      this.engineRunning = true;
      webAudioService.startEngine();
      console.log('Engine sound started via WebAudioService');
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
      console.log(`Can't play ${name} sound until user interacts`);
      return;
    }
    
    const sound = this.sounds.get(name);
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(error => {
        console.warn(`Sound ${name} play prevented: `, error);
      });
    }
  }
  
  // Play collision sound
  public playCollisionSound(): void {
    // Throttle collision sounds to prevent too many at once
    const now = Date.now();
    if (now - this.lastCollisionSound < 300) return;
    
    this.lastCollisionSound = now;
    
    // Create a new oscillator for impact sound
    const context = webAudioService.getAudioContext();
    if (!context) return;
    
    // Create a short crash sound
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    
    // Set up oscillator
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(120, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(40, context.currentTime + 0.2);
    
    // Set up gain node for volume envelope
    gain.gain.setValueAtTime(this.engineVolume, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.3);
    
    // Connect nodes
    oscillator.connect(gain);
    gain.connect(context.destination);
    
    // Start and stop the oscillator
    oscillator.start();
    oscillator.stop(context.currentTime + 0.3);
    
    console.log('Playing collision sound');
  }
}

// Create a singleton instance
export const audioService = new AudioService();

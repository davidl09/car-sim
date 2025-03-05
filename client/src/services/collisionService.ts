import { Vector3 as ThreeVector3 } from 'three';
import { useGameStore } from '@/store/gameStore';
import { socketService } from './socketService';
import { audioService } from './audioService';
import { 
  checkVehicleCollision, 
  checkTreeCollision, 
  calculateDamage,
  calculatePenetrationVector,
  hasSpawnProtection,
  COLLISION_COOLDOWN
} from '@/utils/collisionUtils';
import { Player, Vector3 } from 'shared/types/player';

// Debug flag
const DEBUG = false;

class CollisionService {
  // Keep track of trees we've collided with to avoid repeat collisions
  private treeCollisionTimestamps: Map<string, number> = new Map();
  
  // Check collisions with other vehicles and handle physics response
  public checkVehicleCollisions(playerId: string): ThreeVector3 | null {
    if (!playerId) return null;
    
    try {
      const store = useGameStore.getState();
      const player = store.players[playerId];
      
      if (!player) {
        if (DEBUG) console.log('No player found with ID:', playerId);
        return null;
      }
      
      // Initialize response vector
      let responseVector: ThreeVector3 | null = null;
      
      // Check against all other players
      for (const otherPlayerId in store.players) {
        // Skip checking against ourselves
        if (otherPlayerId === playerId) continue;
        
        const otherPlayer = store.players[otherPlayerId];
        
        try {
          // Check for collision
          if (checkVehicleCollision(player, otherPlayer)) {
            // Calculate collision response vector to push vehicles apart
            const penetrationVector = calculatePenetrationVector(player, otherPlayer);
            
            // Store for physics response
            if (!responseVector) {
              responseVector = new ThreeVector3(penetrationVector.x, penetrationVector.y, penetrationVector.z);
            } else {
              responseVector.add(penetrationVector);
            }
            
            // Process damage for both vehicles involved in collision
            
            // Determine if our player should take damage (no recent collision and no spawn protection)
            const playerCanTakeDamage = !this.hasRecentCollision(player) && !hasSpawnProtection(player);
            
            // Determine if the other player should take damage
            const otherPlayerCanTakeDamage = !this.hasRecentCollision(otherPlayer) && !hasSpawnProtection(otherPlayer);
            
            // Get speeds of both vehicles for damage calculation
            const playerSpeed = this.getPlayerSpeed(player);
            const otherPlayerSpeed = this.getPlayerSpeed(otherPlayer);
            
            // Calculate relative collision speed (average of both speeds)
            const relativeSpeed = (playerSpeed + otherPlayerSpeed) * 0.5;
            
            // Calculate damage for this player based on relative speed
            if (playerCanTakeDamage) {
              const damage = calculateDamage(relativeSpeed);
              
              if (damage > 0) {
                // Apply damage to the player
                store.damagePlayer(playerId, damage);
                
                // Send update to server
                socketService.sendPlayerUpdate({
                  health: isNaN(player.health) ? 100 - damage : player.health - damage,
                  lastCollision: Date.now()
                });
                
                if (DEBUG) console.log(`Our vehicle damaged by ${damage} in collision with ${otherPlayerId}`);
              }
            }
            
            // Calculate damage for other player based on relative speed
            if (otherPlayerCanTakeDamage) {
              const damage = calculateDamage(relativeSpeed);
              
              if (damage > 0) {
                // Apply damage to the other player
                store.damagePlayer(otherPlayerId, damage);
                
                // No need to send update for other player - they'll handle their own health
                // This is just for local rendering
                
                if (DEBUG) console.log(`Other vehicle ${otherPlayerId} damaged by ${damage}`);
              }
            }
            
            // Play collision sound either way
            audioService.playCollisionSound();
            
            if (DEBUG && (playerCanTakeDamage || otherPlayerCanTakeDamage)) {
              console.log(`Collision between ${playerId} and ${otherPlayerId}, relative speed: ${relativeSpeed}`);
            }
          }
        } catch (err) {
          // Error handling without logging
        }
      }
      
      return responseVector;
    } catch (err) {
      // Error handling without logging
      return null;
    }
  }
  
  // Reusable vectors for tree collision detection
  private _position = new ThreeVector3();
  private _treePosition = new ThreeVector3();
  private _direction = new ThreeVector3();
  private _responseVector = new ThreeVector3();
  
  // Check for collisions with trees
  public checkTreeCollisions(
    playerId: string, 
    playerPosition: ThreeVector3, 
    trees: Array<{position: Vector3}>
  ): ThreeVector3 | null {
    if (!playerId) return null;
    
    try {
      const store = useGameStore.getState();
      const player = store.players[playerId];
      
      if (!player) {
        if (DEBUG) console.log('No player found for tree collision with ID:', playerId);
        return null;
      }
      
      // Check for spawn protection
      const hasProtection = hasSpawnProtection(player);
      
      // Don't process damage if we've had a recent collision or have spawn protection
      const skipDamage = this.hasRecentCollision(player) || hasProtection;
      
      // Get the current player's speed
      const playerSpeed = this.getPlayerSpeed(player);
      
      // Use reusable vector for calculations
      this._position.set(
        playerPosition.x,
        playerPosition.y,
        playerPosition.z
      );
      
      // For collision response - reset to null before each use
      let responseVector: ThreeVector3 | null = null;
      
      // Safety check for trees array
      if (!trees || !Array.isArray(trees)) {
        if (DEBUG) console.log('Invalid trees array:', trees);
        return null;
      }
      
      // Check each tree for collision
      for (let i = 0; i < trees.length; i++) {
        const tree = trees[i];
        
        // Skip invalid trees
        if (!tree || !tree.position) continue;
        
        // Create a unique ID for this tree
        const treeId = `tree_${tree.position.x}_${tree.position.z}`;
        
        // Skip if we've recently collided with this tree
        if (this.hasRecentTreeCollision(treeId)) continue;
        
        // Use reusable vector for tree position
        this._treePosition.set(
          tree.position.x,
          tree.position.y || 0,  // Default to 0 if y is undefined
          tree.position.z
        );
        
        try {
          if (checkTreeCollision(this._position, this._treePosition)) {
            // Calculate bounce vector using reusable vector
            this._direction.copy(this._position).sub(this._treePosition).normalize();
            this._direction.y = 0; // Keep bounce on horizontal plane
            
            // Save for physics response
            if (!responseVector) {
              responseVector = this._responseVector.copy(this._direction).multiplyScalar(0.5);
            } else {
              responseVector.add(this._direction.multiplyScalar(0.5));
            }
            
            // Only process damage if not skipping damage
            if (!skipDamage) {
              // Calculate damage based on player's speed
              const damage = calculateDamage(playerSpeed);
              
              if (damage > 0) {
                // Apply damage to the player
                store.damagePlayer(playerId, damage);
                
                // Send update to server with safe health value
                socketService.sendPlayerUpdate({
                  health: isNaN(player.health) ? 100 - damage : player.health - damage,
                  lastCollision: Date.now()
                });
                
                // Record this tree collision
                this.treeCollisionTimestamps.set(treeId, Date.now());
                
                if (DEBUG) console.log(`Collision with tree at ${this._treePosition.x}, ${this._treePosition.z}, damage: ${damage}`);
              }
            }
            
            // Play collision sound regardless of damage
            audioService.playCollisionSound();
          }
        } catch (err) {
          // Error handling without logging
        }
      }
      
      return responseVector;
    } catch (err) {
      // Error handling without logging
      return null;
    }
  }
  
  // Get the player's speed (magnitude of velocity)
  private getPlayerSpeed(player: Player): number {
    return Math.sqrt(
      player.velocity.x * player.velocity.x +
      player.velocity.y * player.velocity.y +
      player.velocity.z * player.velocity.z
    );
  }
  
  // Check if the player has had a recent collision
  private hasRecentCollision(player: Player): boolean {
    if (!player.lastCollision) return false;
    return Date.now() - player.lastCollision < COLLISION_COOLDOWN;
  }
  
  // Check if we've recently collided with a specific tree
  private hasRecentTreeCollision(treeId: string): boolean {
    const timestamp = this.treeCollisionTimestamps.get(treeId);
    if (!timestamp) return false;
    
    // Check if the collision is still in cooldown
    if (Date.now() - timestamp < COLLISION_COOLDOWN) {
      return true;
    }
    
    // Clean up old collision records
    this.treeCollisionTimestamps.delete(treeId);
    return false;
  }
  
  // Periodically clean up old collision records to prevent memory leaks
  // This method should be called regularly to ensure the map doesn't grow infinitely
  public cleanupCollisionRecords(): void {
    const now = Date.now();
    const staleTimestamp = now - COLLISION_COOLDOWN;
    
    // Iterate through all entries and remove any that are older than the cooldown
    this.treeCollisionTimestamps.forEach((timestamp, treeId) => {
      if (timestamp < staleTimestamp) {
        this.treeCollisionTimestamps.delete(treeId);
      }
    });
    
    // Add a size check to prevent the map from growing too large
    if (this.treeCollisionTimestamps.size > 1000) {
      // If we somehow have more than 1000 entries, just clear the entire map
      this.treeCollisionTimestamps.clear();
    }
  }
}

export const collisionService = new CollisionService();

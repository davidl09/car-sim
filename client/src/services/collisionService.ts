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
const DEBUG = true;

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
            
            // Only process damage if we don't have a recent collision and don't have spawn protection
            if (!this.hasRecentCollision(player) && !hasSpawnProtection(player)) {
              // Get the current player's speed
              const playerSpeed = this.getPlayerSpeed(player);
              
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
                
                // Play collision sound
                audioService.playCollisionSound();
                
                if (DEBUG) console.log(`Collision with vehicle ${otherPlayerId}, damage: ${damage}`);
              }
            } else {
              // Still play collision sound even if no damage is taken
              audioService.playCollisionSound();
            }
          }
        } catch (err) {
          console.error('Error in vehicle collision check:', err);
        }
      }
      
      return responseVector;
    } catch (err) {
      console.error('Error in checkVehicleCollisions:', err);
      return null;
    }
  }
  
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
      
      // Create a Three.js Vector3 for calculations
      const position = new ThreeVector3(
        playerPosition.x,
        playerPosition.y,
        playerPosition.z
      );
      
      // For collision response
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
        
        const treePosition = new ThreeVector3(
          tree.position.x,
          tree.position.y || 0,  // Default to 0 if y is undefined
          tree.position.z
        );
        
        try {
          if (checkTreeCollision(position, treePosition)) {
            // Calculate bounce vector
            const direction = new ThreeVector3().subVectors(position, treePosition).normalize();
            direction.y = 0; // Keep bounce on horizontal plane
            
            // Save for physics response
            if (!responseVector) {
              responseVector = direction.clone().multiplyScalar(0.5);
            } else {
              responseVector.add(direction.multiplyScalar(0.5));
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
                
                if (DEBUG) console.log(`Collision with tree at ${treePosition.x}, ${treePosition.z}, damage: ${damage}`);
              }
            }
            
            // Play collision sound regardless of damage
            audioService.playCollisionSound();
          }
        } catch (err) {
          console.error('Error in tree collision check:', err);
        }
      }
      
      return responseVector;
    } catch (err) {
      console.error('Error in checkTreeCollisions:', err);
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
}

export const collisionService = new CollisionService();

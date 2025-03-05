import { Vector3, Box3 } from 'three';
import { Player } from 'shared/types/player';

// Vehicle dimensions
export const VEHICLE_WIDTH = 2; // Width of vehicle in units
export const VEHICLE_HEIGHT = 1.6; // Height of vehicle in units
export const VEHICLE_LENGTH = 4; // Length of vehicle in units
export const TREE_RADIUS = 1.5; // Collision radius for trees

// Minimum speed required to trigger damage (in internal velocity units)
export const MIN_DAMAGE_SPEED = 0.1;

// Collision cooldown in milliseconds to prevent multiple damage events
export const COLLISION_COOLDOWN = 1000;

// Spawn protection time in milliseconds (10 seconds)
export const SPAWN_PROTECTION_TIME = 10000;

// Bounce-back force when vehicles collide (higher = stronger bounce)
export const COLLISION_RESTITUTION = 0.5;

// Maximum distance for collision detection (units)
// Reduced to be more realistic - just over 1 car length
export const MAX_COLLISION_DISTANCE = 5;

// Check if a collision has occurred between two vehicles
export function checkVehicleCollision(player1: Player, player2: Player): boolean {
  // First, perform a quick distance check to avoid unnecessary collision calculations
  const dx = player1.position.x - player2.position.x;
  const dz = player1.position.z - player2.position.z;
  const distanceSquared = dx * dx + dz * dz;
  
  // If vehicles are further than MAX_COLLISION_DISTANCE apart, they can't collide
  if (distanceSquared > MAX_COLLISION_DISTANCE * MAX_COLLISION_DISTANCE) {
    return false;
  }
  
  // If they're close enough, perform detailed collision check
  // Create bounding boxes for both vehicles
  const box1 = createVehicleBoundingBox(
    new Vector3(player1.position.x, player1.position.y, player1.position.z),
    player1.rotation.y
  );
  
  const box2 = createVehicleBoundingBox(
    new Vector3(player2.position.x, player2.position.y, player2.position.z),
    player2.rotation.y
  );
  
  // Check for intersection
  return box1.intersectsBox(box2);
}

// Reusable vectors for penetration calculation
const _pos1 = new Vector3();
const _pos2 = new Vector3();
const _direction = new Vector3();
const _penetration = new Vector3();

// Calculate the penetration vector for vehicle collision response
export function calculatePenetrationVector(player1: Player, player2: Player): Vector3 {
  // Quick distance check - skip calculation for distant players
  const dx = player1.position.x - player2.position.x;
  const dz = player1.position.z - player2.position.z;
  const distanceSquared = dx * dx + dz * dz;
  
  // If vehicles are further than MAX_COLLISION_DISTANCE apart, return zero vector
  if (distanceSquared > MAX_COLLISION_DISTANCE * MAX_COLLISION_DISTANCE) {
    return _penetration.set(0, 0, 0);
  }
  
  // Get positions as Three.js Vector3 - reuse vectors
  _pos1.set(player1.position.x, player1.position.y, player1.position.z);
  _pos2.set(player2.position.x, player2.position.y, player2.position.z);
  
  // Calculate vector pointing from player2 to player1 - reuse vector
  _direction.copy(_pos1).sub(_pos2).normalize();
  
  // Calculate approximate penetration depth based on distance
  const distance = _pos1.distanceTo(_pos2);
  // Reduce minimum distance to make collisions more precise
  // Only consider collision when vehicles are very close
  const minDistance = VEHICLE_WIDTH * 0.8; // Reduced minimum distance between vehicle centers
  const penetrationDepth = Math.max(0, minDistance - distance);
  
  // Calculate the vector to push the vehicles apart - reuse vector
  _penetration.copy(_direction).multiplyScalar(penetrationDepth * COLLISION_RESTITUTION);
  
  return _penetration;
}

// Check if a vehicle collides with a tree
export function checkTreeCollision(
  playerPosition: Vector3,
  treePosition: Vector3
): boolean {
  // Use a simpler distance-based check for trees
  const horizontalDistSq = 
    Math.pow(playerPosition.x - treePosition.x, 2) + 
    Math.pow(playerPosition.z - treePosition.z, 2);
  
  // If the distance is less than the sum of the vehicle's "radius" (half its width)
  // and the tree's radius, we have a collision
  const collisionDistSq = Math.pow(VEHICLE_WIDTH/2 + TREE_RADIUS, 2);
  
  return horizontalDistSq < collisionDistSq;
}

// Calculate damage based on impact speed
export function calculateDamage(speed: number): number {
  if (speed < MIN_DAMAGE_SPEED) return 0;
  
  // Calculate damage as a percentage of max health (25% at max speed)
  // Scale linearly between 0 and 25 based on speed
  const MAX_DAMAGE = 25; // Maximum damage per collision
  const MAX_SPEED = 1.0; // Max velocity in internal units
  
  return Math.min(MAX_DAMAGE, (speed / MAX_SPEED) * MAX_DAMAGE);
}

// Check if a player has spawn protection active
export function hasSpawnProtection(player: Player): boolean {
  // If the player has no joinTime, they don't have protection
  if (!player.joinTime) return false;
  
  // Check if enough time has passed since joining
  return Date.now() - player.joinTime < SPAWN_PROTECTION_TIME;
}

// Reusable vectors for collision detection to prevent memory leaks
const _corners = [
  new Vector3(), new Vector3(), new Vector3(), new Vector3(),
  new Vector3(), new Vector3(), new Vector3(), new Vector3()
];
const _box = new Box3();

// Create a rotated bounding box for a vehicle with a slight reduction in size
function createVehicleBoundingBox(position: Vector3, rotationY: number): Box3 {
  // Create corners of the vehicle in local space
  // Slightly reduce the collision box size to make collisions more precise
  // Using 90% of the actual size makes collisions feel more realistic
  const halfWidth = (VEHICLE_WIDTH * 0.9) / 2;
  const halfHeight = (VEHICLE_HEIGHT * 0.9) / 2;
  const halfLength = (VEHICLE_LENGTH * 0.9) / 2;
  
  // Calculate sin and cos of rotation angle
  const cos = Math.cos(rotationY);
  const sin = Math.sin(rotationY);
  
  // Reset the box for reuse
  _box.makeEmpty();
  
  // Corner index tracker
  let cornerIdx = 0;
  
  // Reuse the same corner vectors instead of creating new ones
  for (let x = -1; x <= 1; x += 2) {
    for (let y = -1; y <= 1; y += 2) {
      for (let z = -1; z <= 1; z += 2) {
        // Local coordinates
        const localX = x * halfWidth;
        const localY = y * halfHeight;
        const localZ = z * halfLength;
        
        // Apply rotation around Y axis
        const rotatedX = localX * cos - localZ * sin;
        const rotatedZ = localX * sin + localZ * cos;
        
        // Apply translation to world space - update the reusable vector
        _corners[cornerIdx].set(
          position.x + rotatedX,
          position.y + localY,
          position.z + rotatedZ
        );
        
        // Add this corner to the box
        _box.expandByPoint(_corners[cornerIdx]);
        
        // Move to next corner
        cornerIdx++;
      }
    }
  }
  
  return _box;
}

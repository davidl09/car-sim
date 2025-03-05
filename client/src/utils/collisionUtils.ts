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
// Significantly increased to ensure vehicles don't stick together
export const COLLISION_RESTITUTION = 2.5;

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

// Reusable rotated bounding box for collision detection
// Optimized to use fewer corner calculations
function createVehicleBoundingBox(position: Vector3, rotationY: number): Box3 {
  // Create corners of the vehicle in local space
  // Reduce collision box size to make collisions more accurate
  // Using 85% of the actual size for more precise collision detection
  const halfWidth = (VEHICLE_WIDTH * 0.85) / 2;
  const halfHeight = (VEHICLE_HEIGHT * 0.85) / 2;
  const halfLength = (VEHICLE_LENGTH * 0.85) / 2;
  
  // Calculate sin and cos of rotation angle
  const cos = Math.cos(rotationY);
  const sin = Math.sin(rotationY);
  
  // Reset the box for reuse
  _box.makeEmpty();
  
  // Instead of calculating all 8 corners (which is expensive),
  // let's only calculate the 4 corners of the horizontal bounding rectangle
  // This is sufficient for most vehicle collisions and is more performant
  
  // Front-right corner
  _corners[0].set(
    position.x + (halfWidth * cos - halfLength * sin),
    position.y,
    position.z + (halfWidth * sin + halfLength * cos)
  );
  _box.expandByPoint(_corners[0]);
  
  // Front-left corner
  _corners[1].set(
    position.x + (-halfWidth * cos - halfLength * sin),
    position.y,
    position.z + (-halfWidth * sin + halfLength * cos)
  );
  _box.expandByPoint(_corners[1]);
  
  // Back-right corner
  _corners[2].set(
    position.x + (halfWidth * cos + halfLength * sin),
    position.y,
    position.z + (halfWidth * sin - halfLength * cos)
  );
  _box.expandByPoint(_corners[2]);
  
  // Back-left corner
  _corners[3].set(
    position.x + (-halfWidth * cos + halfLength * sin),
    position.y,
    position.z + (-halfWidth * sin - halfLength * cos)
  );
  _box.expandByPoint(_corners[3]);
  
  // Add height to the box after creating the base rectangle
  _box.min.y = position.y - halfHeight;
  _box.max.y = position.y + halfHeight;
  
  return _box;
}

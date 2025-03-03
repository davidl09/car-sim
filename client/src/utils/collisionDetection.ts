import * as THREE from 'three';
import { Building, Tree } from 'shared/types/world';
import { Player } from 'shared/types/player';

/**
 * Simple AABB collision detection system
 */

interface Bounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/**
 * Get collision bounds for a player vehicle
 */
export function getPlayerBounds(player: Player): Bounds {
  const halfWidth = 1; // Half the width of the car
  const halfDepth = 2; // Half the length of the car
  
  return {
    minX: player.position.x - halfWidth,
    maxX: player.position.x + halfWidth,
    minZ: player.position.z - halfDepth,
    maxZ: player.position.z + halfDepth,
  };
}

/**
 * Get collision bounds for a building
 */
export function getBuildingBounds(building: Building): Bounds {
  const halfWidth = building.width / 2;
  const halfDepth = building.depth / 2;
  
  return {
    minX: building.x - halfWidth,
    maxX: building.x + halfWidth,
    minZ: building.z - halfDepth,
    maxZ: building.z + halfDepth,
  };
}

/**
 * Get collision bounds for a tree
 */
export function getTreeBounds(tree: Tree): Bounds {
  const radius = tree.radius;
  
  return {
    minX: tree.x - radius,
    maxX: tree.x + radius,
    minZ: tree.z - radius,
    maxZ: tree.z + radius,
  };
}

/**
 * Check for AABB collision between two bounds
 */
export function checkBoundsCollision(bounds1: Bounds, bounds2: Bounds): boolean {
  return (
    bounds1.minX <= bounds2.maxX &&
    bounds1.maxX >= bounds2.minX &&
    bounds1.minZ <= bounds2.maxZ &&
    bounds1.maxZ >= bounds2.minZ
  );
}

/**
 * Check if a player collides with a building
 */
export function checkPlayerBuildingCollision(player: Player, building: Building): boolean {
  const playerBounds = getPlayerBounds(player);
  const buildingBounds = getBuildingBounds(building);
  
  return checkBoundsCollision(playerBounds, buildingBounds);
}

/**
 * Check if a player collides with a tree
 */
export function checkPlayerTreeCollision(player: Player, tree: Tree): boolean {
  const playerBounds = getPlayerBounds(player);
  const treeBounds = getTreeBounds(tree);
  
  return checkBoundsCollision(playerBounds, treeBounds);
}

/**
 * Check if a player collides with another player
 */
export function checkPlayerPlayerCollision(player1: Player, player2: Player): boolean {
  const bounds1 = getPlayerBounds(player1);
  const bounds2 = getPlayerBounds(player2);
  
  return checkBoundsCollision(bounds1, bounds2);
}

/**
 * Calculate collision response - basic implementation
 * 
 * @returns The corrected position after collision
 */
export function calculateCollisionResponse(
  position: THREE.Vector3,
  velocity: THREE.Vector3,
  obstaclePosition: THREE.Vector3,
  damping: number = 0.5
): { 
  position: THREE.Vector3, 
  velocity: THREE.Vector3
} {
  // Direction from obstacle to player
  const direction = new THREE.Vector3()
    .subVectors(position, obstaclePosition)
    .normalize();
  
  // Reflect velocity
  const reflectedVelocity = velocity.clone()
    .reflect(direction)
    .multiplyScalar(damping);
  
  // Move position away from obstacle slightly to prevent sticking
  const pushbackDistance = 0.2;
  const newPosition = position.clone().add(
    direction.clone().multiplyScalar(pushbackDistance)
  );
  
  return {
    position: newPosition,
    velocity: reflectedVelocity,
  };
}

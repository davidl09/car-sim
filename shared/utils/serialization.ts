import { Vector3 } from '../types/player';

/**
 * Simple binary serialization for network packets
 * This is a basic implementation that could be replaced with more optimized solutions like ProtoBuf
 */

// Constants for data type sizes
const FLOAT_SIZE = 4; // 4 bytes per float
const INT_SIZE = 4;   // 4 bytes per int
const CHAR_SIZE = 1;  // 1 byte per char

/**
 * Serialize a Vector3 to a Float32Array
 */
export function serializeVector3(vector: Vector3): Float32Array {
  const buffer = new Float32Array(3);
  buffer[0] = vector.x;
  buffer[1] = vector.y;
  buffer[2] = vector.z;
  return buffer;
}

/**
 * Deserialize a Float32Array to a Vector3
 */
export function deserializeVector3(buffer: Float32Array): Vector3 {
  return {
    x: buffer[0],
    y: buffer[1],
    z: buffer[2],
  };
}

/**
 * Serialize player update data
 * Format: [position, rotation, velocity] as Float32Arrays
 */
export function serializePlayerUpdate(
  position?: Vector3,
  rotation?: Vector3,
  velocity?: Vector3
): ArrayBuffer {
  // Calculate buffer size based on which fields are present
  const hasPosition = !!position;
  const hasRotation = !!rotation;
  const hasVelocity = !!velocity;
  
  // 1 byte flags + 3 potential Vector3s (3 floats each)
  const bufferSize = 1 + (hasPosition ? 3 * FLOAT_SIZE : 0) +
                        (hasRotation ? 3 * FLOAT_SIZE : 0) +
                        (hasVelocity ? 3 * FLOAT_SIZE : 0);
  
  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);
  
  // Set flags
  let flags = 0;
  if (hasPosition) flags |= 1;
  if (hasRotation) flags |= 2;
  if (hasVelocity) flags |= 4;
  view.setUint8(0, flags);
  
  let offset = 1;
  
  // Write position
  if (hasPosition) {
    view.setFloat32(offset, position.x, true);
    view.setFloat32(offset + FLOAT_SIZE, position.y, true);
    view.setFloat32(offset + 2 * FLOAT_SIZE, position.z, true);
    offset += 3 * FLOAT_SIZE;
  }
  
  // Write rotation
  if (hasRotation) {
    view.setFloat32(offset, rotation.x, true);
    view.setFloat32(offset + FLOAT_SIZE, rotation.y, true);
    view.setFloat32(offset + 2 * FLOAT_SIZE, rotation.z, true);
    offset += 3 * FLOAT_SIZE;
  }
  
  // Write velocity
  if (hasVelocity) {
    view.setFloat32(offset, velocity.x, true);
    view.setFloat32(offset + FLOAT_SIZE, velocity.y, true);
    view.setFloat32(offset + 2 * FLOAT_SIZE, velocity.z, true);
  }
  
  return buffer;
}

/**
 * Deserialize player update data
 */
export function deserializePlayerUpdate(buffer: ArrayBuffer): {
  position?: Vector3;
  rotation?: Vector3;
  velocity?: Vector3;
} {
  const view = new DataView(buffer);
  const flags = view.getUint8(0);
  
  const hasPosition = (flags & 1) !== 0;
  const hasRotation = (flags & 2) !== 0;
  const hasVelocity = (flags & 4) !== 0;
  
  let offset = 1;
  const result: {
    position?: Vector3;
    rotation?: Vector3;
    velocity?: Vector3;
  } = {};
  
  // Read position
  if (hasPosition) {
    result.position = {
      x: view.getFloat32(offset, true),
      y: view.getFloat32(offset + FLOAT_SIZE, true),
      z: view.getFloat32(offset + 2 * FLOAT_SIZE, true),
    };
    offset += 3 * FLOAT_SIZE;
  }
  
  // Read rotation
  if (hasRotation) {
    result.rotation = {
      x: view.getFloat32(offset, true),
      y: view.getFloat32(offset + FLOAT_SIZE, true),
      z: view.getFloat32(offset + 2 * FLOAT_SIZE, true),
    };
    offset += 3 * FLOAT_SIZE;
  }
  
  // Read velocity
  if (hasVelocity) {
    result.velocity = {
      x: view.getFloat32(offset, true),
      y: view.getFloat32(offset + FLOAT_SIZE, true),
      z: view.getFloat32(offset + 2 * FLOAT_SIZE, true),
    };
  }
  
  return result;
}

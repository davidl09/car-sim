import { Text } from '@react-three/drei';

export function LoadingPlaceholder() {
  return (
    <group>
      <Text
        position={[0, 0, 0]}
        fontSize={1}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        Loading...
      </Text>
    </group>
  );
}

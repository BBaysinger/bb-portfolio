import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, SoftShadows } from "@react-three/drei";
import * as THREE from "three";

import styles from "./OscillatingCubes.module.scss";

const GRID_SIZE = 10; // 10x10 grid
const SPACING = 0.1; // Distance between cubes

// Cube Component with Oscillation
const OscillatingCube = ({ position }) => {
  const meshRef = useRef(null);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const t = clock.getElapsedTime();
      meshRef.current.position.z =
        Math.sin(t + position[0] * 0.5 + position[1] * 0.5) * 0.5;
    }
  });

  return (
    <mesh ref={meshRef} position={position} castShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#3498db" />
    </mesh>
  );
};

// Scene Component
const OscillatingCubes = () => {
  return (
    <Canvas className={styles["canvas"]} shadows camera={{ position: [0, 0, 15], fov: 50 }}>
      {/* Soft Shadows */}
      <SoftShadows />

      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight
        castShadow
        position={[5, 5, 10]}
        intensity={1}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      {/* Ground Plane to Receive Shadows */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -1]} receiveShadow>
        <planeGeometry args={[GRID_SIZE * SPACING, GRID_SIZE * SPACING]} />
        <meshStandardMaterial color="#ccc" />
      </mesh>

      {/* Grid of Cubes */}
      {Array.from({ length: GRID_SIZE }).map((_, x) =>
        Array.from({ length: GRID_SIZE }).map((_, y) => (
          <OscillatingCube
            key={`${x}-${y}`}
            position={[x * SPACING - 5, y * SPACING - 5, 0]}
          />
        )),
      )}

      {/* Camera Controls */}
      <OrbitControls />
    </Canvas>
  );
};

export default OscillatingCubes;

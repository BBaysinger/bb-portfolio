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
    <mesh ref={meshRef} position={position} castShadow receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#666" />
    </mesh>
  );
};

// Scene Component
const OscillatingCubes = () => {
  return (
    <Canvas
      className={styles["canvas"]}
      shadows
      orthographic
      camera={{
        left: -GRID_SIZE * 0.5,
        right: GRID_SIZE * 0.5,
        top: GRID_SIZE * 0.5,
        bottom: -GRID_SIZE * 0.5,
        near: 1,
        far: 100,
        position: [0, 0, 5], // Adjust as needed
        zoom: 4,
      }}
    >
      {/* Soft Shadows */}
      <SoftShadows size={1} samples={1} />

      {/* Lighting */}
      <ambientLight intensity={0.0} />
      <directionalLight
        castShadow
        position={[5, 0, 5]}
        intensity={1}
        shadow-mapSize-width={10000} // Increase resolution
        shadow-mapSize-height={10000} // Higher values = sharper shadows
      />
      <directionalLight
        castShadow
        position={[0, 5, 5]}
        intensity={1}
        shadow-mapSize-width={10000} // Increase resolution
        shadow-mapSize-height={10000} // Higher values = sharper shadows
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
            position={[
              x * SPACING - (GRID_SIZE * SPACING) / 2,
              y * SPACING - (GRID_SIZE * SPACING) / 2,
              0,
            ]}
          />
        )),
      )}

      {/* Camera Controls */}
      <OrbitControls />
    </Canvas>
  );
};

export default OscillatingCubes;

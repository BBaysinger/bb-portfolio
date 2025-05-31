import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, SoftShadows } from "@react-three/drei";
import * as THREE from "three";

import styles from "./OscillatingCubes.module.scss";

const GRID_SIZE = 10; // 10x10 grid
const SPACING = 0.1; // Distance between cubes

/**
 * Cube Component with Oscillation and Custom Shadow Fixes
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */

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
      <meshLambertMaterial color="#666" />

      {/* Fix for accurate depth rendering in shadows */}
      <meshDepthMaterial
        attach="customDepthMaterial"
        depthPacking={THREE.RGBADepthPacking}
      />
    </mesh>
  );
};

/**
 * Scene Component
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const OscillatingCubes = () => {
  return (
    <Canvas
      className={styles.canvas}
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
      <SoftShadows size={25} samples={16} />

      {/* Ambient Light for Soft Global Illumination */}
      <ambientLight intensity={0.2} />

      {/* High-Quality Directional Light */}
      <directionalLight
        castShadow
        position={[-5, 5, 5]}
        intensity={5}
        shadow-mapSize-width={4096} // High shadow resolution
        shadow-mapSize-height={4096}
        shadow-bias={-0.002} // Fixes shadow artifacts
      />

      {/* 🔥 SpotLight to Ensure Cube-to-Cube Shadows Work 🔥 */}
      <spotLight
        castShadow
        position={[5, 10, 5]} // Higher placement for better shadows
        intensity={15} // Balanced brightness
        penumbra={1} // Soft shadow edges
        angle={Math.PI / 3} // Wider beam
        distance={30} // Ensure light reaches objects
        target-position={[0, 0, 0]} // Focus the light on cubes
        shadow-mapSize-width={4096} // High-resolution shadows
        shadow-mapSize-height={4096}
        shadow-bias={-0.002} // Prevents shadow artifacts
      />

      {/* Ground Plane to Receive Shadows */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -1]} receiveShadow>
        <planeGeometry args={[GRID_SIZE * SPACING, GRID_SIZE * SPACING]} />
        <meshLambertMaterial color="#ccc" />
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

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { useGameStore } from "../lib/useGameStore";
import { Cloth, Hair, Wood } from "./characters/materials";

// HORSE
// A patient low-poly chestnut horse standing beside J Hole (who sits at
// [-2.2, 0, 0.6]). Primitive-built to match the band. Breathes idly and
// nods along when a song is playing. Local axes: head faces +x.

export default function Horse() {
  const body = useRef<Group>(null);
  const head = useRef<Group>(null);
  const tail = useRef<Group>(null);
  const isPlaying = useGameStore((s) => s.isPlaying);
  const reducedMotion = useGameStore((s) => s.reducedMotion);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const motion = reducedMotion ? 0.3 : 1;
    if (body.current) {
      body.current.position.y = Math.sin(t * 1.1) * 0.012 * motion;
    }
    if (head.current) {
      // idle grazing sway; nods on the beat when the band plays
      head.current.rotation.z = isPlaying
        ? Math.sin(t * 4) * 0.12 * motion
        : Math.sin(t * 0.7) * 0.05 * motion;
    }
    if (tail.current) {
      tail.current.rotation.x = Math.sin(t * 2.3) * 0.18 * motion;
    }
  });

  return (
    <group position={[-3.7, 0, 1.4]} rotation={[0, 0.9, 0]}>
      <group ref={body}>
        {/* torso */}
        <mesh position={[0, 0.95, 0]} castShadow>
          <boxGeometry args={[0.95, 0.42, 0.36]} />
          <Wood base="#7a4e26" dark="#2a1708" planks={1} />
        </mesh>
        {/* saddle blanket */}
        <mesh position={[-0.05, 1.12, 0]} rotation={[0, 0, 0]} castShadow>
          <boxGeometry args={[0.5, 0.12, 0.46]} />
          <Cloth color="#6b1f2a" />
        </mesh>
        <mesh position={[-0.05, 1.16, 0]}>
          <boxGeometry args={[0.52, 0.06, 0.1]} />
          <Cloth color="#c9a24b" />
        </mesh>
        {/* rump + chest rounding */}
        <mesh position={[-0.45, 0.97, 0]} castShadow>
          <sphereGeometry args={[0.21, 10, 10]} />
          <Wood base="#74481f" dark="#2a1708" planks={1} />
        </mesh>
        <mesh position={[0.45, 0.97, 0]} castShadow>
          <sphereGeometry args={[0.19, 10, 10]} />
          <Wood base="#7a4e26" dark="#2a1708" planks={1} />
        </mesh>

        {/* neck + head (pivot so it can nod) */}
        <group ref={head} position={[0.45, 1.15, 0]}>
          <mesh position={[0.12, 0.22, 0]} rotation={[0, 0, -0.55]} castShadow>
            <boxGeometry args={[0.18, 0.5, 0.22]} />
            <Wood base="#7a4e26" dark="#2a1708" planks={1} />
          </mesh>
          {/* mane ridge */}
          <mesh position={[0.02, 0.28, 0]} rotation={[0, 0, -0.55]}>
            <boxGeometry args={[0.05, 0.48, 0.08]} />
            <Hair color="#2a1c10" />
          </mesh>
          {/* head + muzzle */}
          <mesh position={[0.36, 0.42, 0]} rotation={[0, 0, -0.25]} castShadow>
            <boxGeometry args={[0.34, 0.17, 0.17]} />
            <Wood base="#7a4e26" dark="#2a1708" planks={1} />
          </mesh>
          <mesh position={[0.52, 0.38, 0]}>
            <boxGeometry args={[0.12, 0.12, 0.14]} />
            <Wood base="#3d2817" dark="#1a0e04" planks={1} />
          </mesh>
          {/* rope halter */}
          <mesh position={[0.4, 0.4, 0]} rotation={[0, 0, -0.25]}>
            <torusGeometry args={[0.1, 0.012, 6, 14]} />
            <meshStandardMaterial color="#c9b58a" roughness={1} />
          </mesh>
          {/* ears */}
          {[-0.055, 0.055].map((z, i) => (
            <mesh key={i} position={[0.24, 0.56, z]} rotation={[0, 0, -0.2]}>
              <coneGeometry args={[0.035, 0.1, 6]} />
              <Wood base="#5c3d1e" dark="#1a0e04" planks={1} />
            </mesh>
          ))}
          {/* eyes */}
          {[-0.09, 0.09].map((z, i) => (
            <mesh key={i} position={[0.31, 0.45, z]}>
              <sphereGeometry args={[0.02, 6, 6]} />
              <meshStandardMaterial color="#120d06" roughness={0.4} />
            </mesh>
          ))}
        </group>

        {/* tail (pivot so it can swish) */}
        <group ref={tail} position={[-0.6, 1.05, 0]}>
          <mesh position={[-0.06, -0.22, 0]} rotation={[0, 0, 0.25]} castShadow>
            <coneGeometry args={[0.07, 0.5, 8]} />
            <Hair color="#2a1c10" />
          </mesh>
        </group>
      </group>

      {/* legs + hooves (static, planted) */}
      {(
        [
          [0.35, 0.14],
          [0.35, -0.14],
          [-0.38, 0.14],
          [-0.38, -0.14],
        ] as const
      ).map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.42, 0]} castShadow>
            <cylinderGeometry args={[0.045, 0.055, 0.72, 8]} />
            <Wood base="#5c3d1e" dark="#1a0e04" planks={1} />
          </mesh>
          <mesh position={[0, 0.04, 0]}>
            <cylinderGeometry args={[0.055, 0.06, 0.08, 8]} />
            <meshStandardMaterial color="#2a1c10" roughness={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

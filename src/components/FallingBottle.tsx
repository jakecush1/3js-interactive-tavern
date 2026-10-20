import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";

// FALLING BOTTLE — no physics engine required.
// Simple kinematic drop: starts high, falls with fake gravity, rotates, and
// calls onDone() once it has settled so the spawner can clean it up.
//
// TO REPLACE WITH A REAL ASSET:
//   Swap the inner meshes for <primitive object={gltf.scene} /> and apply a
//   licensed label texture to the body mesh. Keep the outer <group ref={ref}>.

type Props = {
  id: number;
  position: [number, number, number];
  vx: number; // initial horizontal drift
  vz: number;
  rotSpeed: [number, number, number];
  onDone: (id: number) => void;
};

const GRAVITY = -9;
const FLOOR_Y = 0.28; // visual resting height (half bottle height * scale)

export default function FallingBottle({ id, position, vx, vz, rotSpeed, onDone }: Props) {
  const ref = useRef<Group>(null);
  const vy = useRef(0);
  const pos = useRef<[number, number, number]>([...position]);
  const settled = useRef(false);
  const doneRef = useRef(false);

  useEffect(() => () => { doneRef.current = true; }, []);

  useFrame((_, rawDt) => {
    if (!ref.current || doneRef.current) return;
    if (settled.current) return;

    // Clamp the timestep: the first frame (or any tab hitch) can report a
    // multi-second delta, which would otherwise fling the bottle straight
    // through the floor before it's ever seen.
    const dt = Math.min(rawDt, 1 / 30);

    vy.current += GRAVITY * dt;
    pos.current[0] += vx * dt;
    pos.current[1] += vy.current * dt;
    pos.current[2] += vz * dt;

    if (pos.current[1] <= FLOOR_Y) {
      pos.current[1] = FLOOR_Y;
      vy.current *= -0.28; // bounce
      if (Math.abs(vy.current) < 0.4) {
        settled.current = true;
        // despawn after lying still for a moment
        setTimeout(() => { if (!doneRef.current) onDone(id); }, 5000);
      }
    }

    ref.current.position.set(...pos.current);
    if (!settled.current) {
      ref.current.rotation.x += rotSpeed[0] * dt;
      ref.current.rotation.y += rotSpeed[1] * dt;
      ref.current.rotation.z += rotSpeed[2] * dt;
    }
  });

  const glassColors = ["#2f6b2f","#356b2a","#2a5f3a","#3a6b22"];
  const glassColor = glassColors[id % glassColors.length];

  return (
    <group ref={ref} position={position} scale={0.5}>
      {/* body */}
      <mesh>
        <cylinderGeometry args={[0.12, 0.12, 0.5, 12]} />
        <meshStandardMaterial color={glassColor} roughness={0.2} metalness={0.1} />
      </mesh>
      {/* shoulder */}
      <mesh position={[0, 0.32, 0]}>
        <coneGeometry args={[0.12, 0.18, 12]} />
        <meshStandardMaterial color={glassColor} roughness={0.2} metalness={0.1} />
      </mesh>
      {/* neck */}
      <mesh position={[0, 0.46, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.18, 10]} />
        <meshStandardMaterial color={glassColor} roughness={0.2} metalness={0.1} />
      </mesh>
      {/* gold foil cap */}
      <mesh position={[0, 0.56, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 0.06, 10]} />
        <meshStandardMaterial color="#d4af37" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* label — swap map for a licensed texture later */}
      <mesh position={[0, 0, 0.001]}>
        <cylinderGeometry args={[0.121, 0.121, 0.22, 12, 1, true]} />
        <meshStandardMaterial color="#f3e6c4" roughness={0.6} side={2} />
      </mesh>
    </group>
  );
}

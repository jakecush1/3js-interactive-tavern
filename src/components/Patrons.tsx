import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { useGameStore } from "../lib/useGameStore";
import Figure, { Stool, type FigureLook } from "./characters/Figure";
import { Cloth, Metal, Wood } from "./characters/materials";
import { Bottle, Jug, Tankard } from "./Bar";

// PATRONS
// A side table in the front-right corner where a fat merchant in a feathered
// beret and a hooded traveller have stopped in for the evening. They listen
// to the band, nod along when a song plays, and occasionally raise a cup.

const MERCHANT: FigureLook = {
  build: "portly",
  skin: "#e6b797",
  outfit: { kind: "doublet", color: "#5a1f2a", accent: "#c9a24b", sleeves: "slashed", sleeveColor: "#efe6d2", collar: "ruff", belt: true },
  legs: { hose: "#2a2024", boots: "#2e1d10" },
  hair: { style: "short", color: "#8a8078" },
  facialHair: "goatee",
  hat: { kind: "beret", color: "#2a1a1a", feather: "#e8dcc0" },
  expression: "smile",
  nose: "big",
  eyeColor: "#4a2e17",
  blush: 0.35,
};

const TRAVELLER: FigureLook = {
  build: "slim",
  skin: "#c9926a",
  outfit: { kind: "tunic", color: "#3a3a2e", accent: "#2a2520", sleeves: "plain", sleeveColor: "#3a3a2e", collar: "hood", cloak: "#2e2a24", belt: true },
  legs: { hose: "#2a2520", boots: "#1e1812" },
  hair: { style: "long", color: "#1a120c" },
  facialHair: "beard",
  expression: "neutral",
  nose: "medium",
  eyeColor: "#2a1a10",
  blush: 0.05,
};

function Listener({
  look,
  position,
  rotation,
  phase,
  armPose,
  held,
}: {
  look: FigureLook;
  position: [number, number, number];
  rotation: number;
  phase: number;
  armPose: { left: [number, number, number]; right: [number, number, number]; leftElbow: number; rightElbow: number };
  held?: React.ReactNode;
}) {
  const body = useRef<Group>(null);
  const head = useRef<Group>(null);
  const rightArm = useRef<Group>(null);
  const isPlaying = useGameStore((s) => s.isPlaying);
  const reducedMotion = useGameStore((s) => s.reducedMotion);

  useFrame((state) => {
    if (reducedMotion) return;
    const t = state.clock.elapsedTime;
    if (body.current) body.current.position.y = Math.sin(t * 1.2 + phase) * 0.012;
    if (head.current) {
      head.current.rotation.x = isPlaying ? Math.sin(t * 4 + phase) * 0.1 : Math.sin(t * 0.8 + phase) * 0.04;
      head.current.rotation.y = Math.sin(t * 0.5 + phase) * 0.25;
    }
    if (rightArm.current && held) {
      // raise a toast every so often
      const toast = Math.pow(Math.max(0, Math.sin(t * 0.3 + phase)), 4);
      rightArm.current.rotation.z = armPose.right[2] - toast * 1.3;
      rightArm.current.rotation.x = armPose.right[0] - toast * 0.3;
    }
  });

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Stool />
      <group ref={body}>
        <Figure look={look} pose="seated" refs={{ head, rightArm }} armPose={armPose} heldRight={held} />
      </group>
    </group>
  );
}

export default function Patrons() {
  return (
    <group position={[4.9, 0, 3.2]}>
      {/* round pedestal table */}
      <mesh position={[0, 0.74, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.62, 0.62, 0.06, 20]} />
        <Wood base="#6a4626" dark="#231206" planks={5} />
      </mesh>
      <mesh position={[0, 0.38, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 0.68, 10]} />
        <Wood base="#4a3018" dark="#1a0e04" planks={1} />
      </mesh>
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.32, 0.36, 0.06, 12]} />
        <Wood base="#4a3018" dark="#1a0e04" planks={1} />
      </mesh>
      {/* on the table */}
      <Bottle position={[0.15, 0.77, -0.1]} color="#3f5a2e" />
      <Tankard position={[-0.25, 0.845, 0.15]} />
      <Jug position={[0.25, 0.77, 0.25]} color="#7a5a3a" scale={0.8} />
      <mesh position={[-0.15, 0.78, -0.25]}>
        <cylinderGeometry args={[0.13, 0.11, 0.02, 14]} />
        <meshStandardMaterial color="#cfc3a6" roughness={0.6} />
      </mesh>
      {[[-0.18, -0.25], [-0.1, -0.2]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.82, z]} scale={[1.3, 0.7, 1]}>
          <sphereGeometry args={[0.05, 10, 8]} />
          <meshStandardMaterial color="#b98a52" roughness={0.9} />
        </mesh>
      ))}
      {/* candle in a dish */}
      <group position={[0, 0.77, 0]}>
        <mesh>
          <cylinderGeometry args={[0.07, 0.06, 0.015, 12]} />
          <Metal color="#b8923a" roughness={0.4} metalness={0.8} />
        </mesh>
        <mesh position={[0, 0.07, 0]}>
          <cylinderGeometry args={[0.025, 0.03, 0.13, 8]} />
          <meshStandardMaterial color="#e8dcc0" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.165, 0]}>
          <coneGeometry args={[0.02, 0.07, 8]} />
          <meshBasicMaterial color="#ffce6b" />
        </mesh>
        <pointLight position={[0, 0.25, 0]} color="#ffb347" intensity={0.7} distance={2.6} decay={2} />
      </group>

      {/* the merchant, cup in hand */}
      <Listener
        look={MERCHANT}
        position={[-0.55, 0, -0.55]}
        rotation={Math.PI * 0.72}
        phase={0.4}
        armPose={{ left: [-1.0, 0, 0.35], leftElbow: -1.2, right: [-0.7, 0, -0.3], rightElbow: -1.5 }}
        held={<Tankard position={[0, 0, 0]} />}
      />
      {/* the traveller, chin in hand, elbow on the table */}
      <Listener
        look={TRAVELLER}
        position={[0.75, 0, -0.25]}
        rotation={-Math.PI * 0.68}
        phase={2.2}
        armPose={{ left: [-1.35, 0, 0.1], leftElbow: -1.9, right: [-0.9, 0, -0.4], rightElbow: -1.2 }}
      />

      {/* the traveller's pack and staff by the table */}
      <group position={[0.95, 0, 0.45]}>
        <mesh position={[0, 0.2, 0]} rotation={[0, 0.4, 0]} castShadow>
          <boxGeometry args={[0.3, 0.4, 0.2]} />
          <Cloth color="#4a3a2a" coarse />
        </mesh>
        <mesh position={[0.25, 0.7, -0.1]} rotation={[0.1, 0, 0.18]} castShadow>
          <cylinderGeometry args={[0.018, 0.022, 1.5, 8]} />
          <Wood base="#5a3a1c" dark="#1f1206" planks={1} />
        </mesh>
      </group>
    </group>
  );
}

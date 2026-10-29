import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { useGameStore } from "../lib/useGameStore";
import { getSong } from "../data/songs";
import Figure, { Stool, useRig, type FigureLook } from "./characters/Figure";
import { poseDance, poseStagger } from "./characters/animation";
import { Metal, Wood } from "./characters/materials";
import SongTrigger from "./SongTrigger";

// BAR
// A timber bar along the right wall: panelled counter, back shelves with
// bottles and crockery, hanging tankards, a lantern, and the regulars —
// a grey-bearded barkeep roaring with laughter, and two regulars from the
// reference board in /public/band/members: Bald Hammer (ginger beard,
// toasting nobody in particular) and Scruff (black beanie, face-down on
// the counter).

export function Tankard({
  position,
  tipped = false,
  glass = false,
  rotation = 0,
}: {
  position: [number, number, number];
  tipped?: boolean;
  glass?: boolean;
  rotation?: number;
}) {
  return (
    <group position={position} rotation={tipped ? [0, rotation, Math.PI / 2] : [0, rotation, 0]}>
      <mesh>
        <cylinderGeometry args={[0.055, 0.065, 0.15, 12]} />
        {glass ? (
          <meshStandardMaterial color="#d8d2c0" transparent opacity={0.4} roughness={0.2} />
        ) : (
          <Wood base="#7a5a34" dark="#2a1a08" planks={6} />
        )}
      </mesh>
      {!glass &&
        [-0.05, 0.05].map((y) => (
          <mesh key={y} position={[0, y, 0]}>
            <cylinderGeometry args={[0.062, 0.067, 0.016, 12]} />
            <Metal color="#9a9ca3" />
          </mesh>
        ))}
      <mesh position={[0.07, 0, 0]}>
        <torusGeometry args={[0.04, 0.011, 6, 12, Math.PI]} />
        <meshStandardMaterial color={glass ? "#c9c3b0" : "#4a2e14"} roughness={0.6} />
      </mesh>
    </group>
  );
}

export function Bottle({
  position,
  color = "#3f5a2e",
  height = 0.26,
  rotation = [0, 0, 0] as [number, number, number],
}: {
  position: [number, number, number];
  color?: string;
  height?: number;
  rotation?: [number, number, number];
}) {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, height / 2, 0]}>
        <cylinderGeometry args={[0.05, 0.055, height, 10]} />
        <meshStandardMaterial color={color} roughness={0.25} metalness={0.05} />
      </mesh>
      <mesh position={[0, height + 0.03, 0]}>
        <sphereGeometry args={[0.05, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
        <meshStandardMaterial color={color} roughness={0.25} />
      </mesh>
      <mesh position={[0, height + 0.1, 0]}>
        <cylinderGeometry args={[0.017, 0.02, 0.12, 8]} />
        <meshStandardMaterial color={color} roughness={0.25} />
      </mesh>
      <mesh position={[0, height + 0.15, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 0.03, 8]} />
        <meshStandardMaterial color="#5a3a1c" roughness={0.9} />
      </mesh>
      {/* paper label */}
      <mesh position={[0, height * 0.45, 0.051]}>
        <planeGeometry args={[0.06, 0.08]} />
        <meshStandardMaterial color="#e3d6b4" roughness={0.9} />
      </mesh>
    </group>
  );
}

export function Jug({ position, color = "#8a6a4a", scale = 1 }: { position: [number, number, number]; color?: string; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.11, 0]}>
        <sphereGeometry args={[0.12, 14, 12]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.24, 0]}>
        <cylinderGeometry args={[0.055, 0.075, 0.08, 12]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      <mesh position={[0.13, 0.17, 0]} rotation={[0, 0, 0.2]}>
        <torusGeometry args={[0.06, 0.016, 6, 12, Math.PI]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      {/* glaze band */}
      <mesh position={[0, 0.17, 0]}>
        <cylinderGeometry args={[0.105, 0.115, 0.03, 14]} />
        <meshStandardMaterial color="#3a2a1a" roughness={0.4} />
      </mesh>
    </group>
  );
}

function PickledEggJar({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.13, 0]}>
        <cylinderGeometry args={[0.115, 0.115, 0.24, 12]} />
        <meshStandardMaterial color="#98a565" transparent opacity={0.5} roughness={0.4} />
      </mesh>
      {(
        [
          [0, 0.07, 0],
          [0.05, 0.09, 0.04],
          [-0.05, 0.08, -0.03],
          [0.02, 0.17, -0.04],
          [-0.03, 0.18, 0.04],
        ] as const
      ).map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]} scale={[1, 1.25, 1]}>
          <sphereGeometry args={[0.045, 10, 8]} />
          <meshStandardMaterial color="#e8e0cc" roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.13, 0.13, 0.3, 12]} />
        <meshStandardMaterial color="#c9d4b0" transparent opacity={0.28} roughness={0.15} />
      </mesh>
      <mesh position={[0, 0.32, 0]}>
        <cylinderGeometry args={[0.135, 0.135, 0.035, 12]} />
        <Wood base="#3d2817" dark="#160c04" planks={2} />
      </mesh>
    </group>
  );
}

// --- the regulars --------------------------------------------------------

const BARKEEP: FigureLook = {
  build: "portly",
  skin: "#dcb08c",
  outfit: { kind: "shirt", sleeveColor: "#efe6d2", sleeves: "rolled", vest: "#3f4a33", apron: "#cfc0a0", collar: "flat", belt: true, towel: true },
  legs: { hose: "#4a3a2a", boots: "#2e1d10" },
  hair: { style: "bald", color: "#9a9088" },
  facialHair: "bigbeard",
  expression: "laugh",
  nose: "red",
  blush: 0.55,
  eyeColor: "#3a5a7a",
};

const BALD_HAMMER: FigureLook = {
  build: "portly",
  skin: "#e3ad88",
  outfit: { kind: "shirt", sleeveColor: "#efe6d2", sleeves: "rolled", vest: "#4e4a30", collar: "flat", belt: true },
  legs: { hose: "#3f4a30", boots: "#3b2614", bootCuffs: true },
  hair: { style: "bald", color: "#b5522a" },
  facialHair: "bigbeard",
  expression: "laugh",
  nose: "red",
  eyeColor: "#3a5a7a",
  blush: 0.5,
};

const SCRUFF: FigureLook = {
  build: "slim",
  skin: "#dba982",
  outfit: { kind: "shirt", sleeveColor: "#e6dcc4", sleeves: "rolled", suspenders: "#3a2a1c", collar: "flat", belt: true },
  legs: { hose: "#2f2a26", boots: "#2b2416" },
  hair: { style: "messy", color: "#1f1510" },
  hat: { kind: "beanie", color: "#1a1714" },
  facialHair: "stubble",
  expression: "sleepy",
  nose: "medium",
  blush: 0.3,
};

// Gaunt, grey, three sheets to the wind: scraggly hair under a slouching
// cap, stubble, a long red nose, a faded tunic coming untucked, and a
// tankard he has not put down all night.
const SOUSED: FigureLook = {
  build: "slim",
  skin: "#d9a98a",
  outfit: { kind: "tunic", color: "#5a4a3a", accent: "#3a2a1c", sleeves: "plain", sleeveColor: "#5a4a3a", collar: "flat", belt: true },
  legs: { hose: "#3a3028", boots: "#2b2416" },
  hair: { style: "scraggly", color: "#6a6058" },
  hat: { kind: "cap", color: "#3a2e24" },
  facialHair: "mustache-stubble",
  expression: "sleepy",
  nose: "red",
  eyeColor: "#4a3a2a",
  blush: 0.5,
};

function Barkeep() {
  const ref = useRef<Group>(null);
  const rightArm = useRef<Group>(null);
  const head = useRef<Group>(null);
  const reducedMotion = useGameStore((s) => s.reducedMotion);
  useFrame((state) => {
    if (!ref.current || reducedMotion) return;
    const t = state.clock.elapsedTime;
    // jolly belly-laugh: quick bounce, a chuckle sway
    const chuckle = Math.pow(Math.max(0, Math.sin(t * 0.35)), 2);
    ref.current.position.y = Math.sin(t * 1.3) * 0.015 + chuckle * Math.abs(Math.sin(t * 7)) * 0.03;
    ref.current.rotation.y = Math.sin(t * 0.4) * 0.08;
    ref.current.rotation.z = chuckle * Math.sin(t * 7) * 0.03;
    if (head.current) head.current.rotation.x = -0.1 - chuckle * 0.25;
    if (rightArm.current) rightArm.current.rotation.z = -2.2 - chuckle * 0.3;
  });
  return (
    <group position={[6.35, 0, -0.2]} rotation={[0, -Math.PI / 2, 0]}>
      <group ref={ref}>
        <Figure
          look={BARKEEP}
          pose="standing"
          refs={{ rightArm, head }}
          armPose={{ left: [-0.9, 0, 0.5], leftElbow: -1.3, right: [-0.2, 0, -2.2], rightElbow: -0.7 }}
          heldRight={<Tankard position={[0, 0, 0]} />}
          heldLeft={
            <mesh>
              <boxGeometry args={[0.12, 0.08, 0.02]} />
              <meshStandardMaterial color="#d8d2c0" roughness={0.95} />
            </mesh>
          }
        />
      </group>
    </group>
  );
}

// Up off his stool and dancing — a bouncing, hip-swinging samba in time
// with whatever the band is playing (and to a tune in his head when they
// are not), tankard still in hand.
function Dancer({ position, rotation }: { position: [number, number, number]; rotation: number }) {
  const rig = useRig();
  const reducedMotion = useGameStore((s) => s.reducedMotion);
  const isPlaying = useGameStore((s) => s.isPlaying);
  const currentSongId = useGameStore((s) => s.currentSongId);
  const song = getSong(currentSongId);
  const bpm = isPlaying && song ? song.bpm : 96;
  useFrame((state) => {
    const t = reducedMotion ? 2.3 : state.clock.elapsedTime;
    poseDance(rig, t, { bpm, energy: isPlaying ? 1 : 0.6, drunk: 0.7 });
  });
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <SongTrigger songId="boot-hole" label="Boot Hole">
        <Figure look={BALD_HAMMER} pose="standing" refs={rig} heldLeft={<Tankard position={[0, 0, 0]} />} />
      </SongTrigger>
    </group>
  );
}

// Still on his feet, technically: swaying in slow circles, knees soft,
// arms out for balance, catching himself with a sideways step whenever the
// room tilts too far, and steadying his nerves with another swig.
function Staggerer({ position, rotation, seed = 0 }: { position: [number, number, number]; rotation: number; seed?: number }) {
  const rig = useRig();
  const reducedMotion = useGameStore((s) => s.reducedMotion);
  useFrame((state) => {
    const t = reducedMotion ? 1.0 : state.clock.elapsedTime;
    poseStagger(rig, t, { seed, tankard: "right" });
  });
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <SongTrigger songId="crashed-my-boat" label="Crashed my Boat">
        <Figure look={SOUSED} pose="standing" refs={rig} heldRight={<Tankard position={[0, 0, 0]} />} />
      </SongTrigger>
    </group>
  );
}

function SlumpedDrunk({ position }: { position: [number, number, number] }) {
  const torso = useRef<Group>(null);
  const reducedMotion = useGameStore((s) => s.reducedMotion);
  useFrame((state) => {
    if (!torso.current || reducedMotion) return;
    const t = state.clock.elapsedTime;
    // face-down on the counter, the occasional heave
    torso.current.rotation.x = 1.05 + Math.sin(t * 0.8) * 0.02;
  });
  return (
    <group position={position} rotation={[0, Math.PI / 2, 0]}>
      <Stool seatY={0.62} r={0.21} />
      <group position={[0, 0.22, 0]}>
        <Figure
          look={SCRUFF}
          pose="seated"
          refs={{ torso }}
          armPose={{ left: [-1.6, 0, 0.3], leftElbow: -0.3, right: [-1.5, 0, -0.5], rightElbow: -0.9 }}
        />
      </group>
    </group>
  );
}

function Shelf({ y, length = 3.2 }: { y: number; length?: number }) {
  return (
    <group position={[6.68, y, 0]}>
      <mesh>
        <boxGeometry args={[0.26, 0.05, length]} />
        <Wood base="#5a3b20" dark="#1f1206" planks={1} />
      </mesh>
      {[-length / 2 + 0.2, 0, length / 2 - 0.2].map((z) => (
        <mesh key={z} position={[0.08, -0.08, z]} rotation={[0, 0, 0.6]}>
          <boxGeometry args={[0.03, 0.2, 0.04]} />
          <Metal color="#3a3a3a" roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

export default function Bar() {
  return (
    <group>
      {/* counter: panelled front + thick polished top */}
      <mesh position={[5.75, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.55, 1.0, 3.8]} />
        <Wood base="#5e3f22" dark="#1f1206" planks={2} repeat={[1, 4]} />
      </mesh>
      {[-1.4, -0.7, 0, 0.7, 1.4].map((z) => (
        <mesh key={z} position={[5.46, 0.5, z]}>
          <boxGeometry args={[0.03, 0.8, 0.5]} />
          <Wood base="#4a3018" dark="#1a0e04" planks={1} />
        </mesh>
      ))}
      <mesh position={[5.75, 1.06, 0]} castShadow>
        <boxGeometry args={[0.9, 0.1, 4.1]} />
        <Wood base="#8a5f33" dark="#2a1708" planks={2} repeat={[1, 3]} roughness={0.45} />
      </mesh>
      {/* brass foot rail */}
      <mesh position={[5.35, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 3.8, 8]} />
        <Metal color="#b8923a" roughness={0.35} metalness={0.85} />
      </mesh>

      {/* back shelves on the right wall */}
      <Shelf y={1.75} />
      <Shelf y={2.35} />
      <Shelf y={2.95} length={2.4} />
      {[-1.4, -1.0, -0.6, -0.15, 0.3, 0.75, 1.15, 1.45].map((z, i) => (
        <Bottle
          key={i}
          position={[6.68, 1.78, z]}
          color={["#3f5a2e", "#7a4a1a", "#5a2e2e", "#2e4a5a", "#7a4a1a", "#44507a", "#5a3a2e", "#3f5a2e"][i]}
          height={0.2 + (i % 3) * 0.04}
        />
      ))}
      {[-1.3, -0.5, 0.3, 1.1].map((z, i) => (
        <Jug key={i} position={[6.68, 2.38, z]} color={["#8a6a4a", "#6b5a4a", "#9a7a5a", "#7a5a3a"][i]} scale={0.75} />
      ))}
      {[-0.9, -0.1, 0.7].map((z, i) => (
        <Tankard key={i} position={[6.68, 2.46, z]} glass={i === 1} />
      ))}
      {/* stacked plates */}
      {[-0.8, 0.6].map((z) => (
        <group key={z} position={[6.68, 2.98, z]}>
          {[0, 1, 2, 3].map((i) => (
            <mesh key={i} position={[0, i * 0.022, 0]}>
              <cylinderGeometry args={[0.12, 0.1, 0.02, 14]} />
              <meshStandardMaterial color="#cfc3a6" roughness={0.6} />
            </mesh>
          ))}
        </group>
      ))}
      {/* keg on its side behind the bar */}
      <group position={[6.45, 0.42, -1.55]} rotation={[0, 0, Math.PI / 2]}>
        <mesh>
          <cylinderGeometry args={[0.36, 0.32, 0.7, 16]} />
          <Wood base="#5a3a1d" dark="#1f1206" planks={8} />
        </mesh>
        {[-0.22, 0.22].map((y) => (
          <mesh key={y} position={[0, y, 0]}>
            <torusGeometry args={[0.35, 0.022, 8, 24]} />
            <Metal color="#3a3a3a" roughness={0.6} />
          </mesh>
        ))}
        <mesh position={[0.2, -0.36, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.03, 0.03, 0.12, 8]} />
          <Metal color="#b8923a" roughness={0.4} metalness={0.85} />
        </mesh>
      </group>

      {/* tankards hanging from hooks under the lowest shelf */}
      {[-1.2, -0.75, -0.3, 0.15, 0.6, 1.05].map((z, i) => (
        <group key={i} position={[6.6, 1.6, z]}>
          <mesh position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.006, 0.006, 0.12, 6]} />
            <Metal color="#3a3a3a" />
          </mesh>
          <Tankard position={[0, -0.02, 0]} glass={i % 3 === 2} rotation={i * 0.7} />
        </group>
      ))}

      {/* hanging lantern over the bar */}
      <group position={[5.8, 2.6, 0.9]}>
        <mesh position={[0, 0.85, 0]}>
          <cylinderGeometry args={[0.008, 0.008, 1.7, 6]} />
          <Metal color="#2a2a2a" />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.1, 0.12, 0.26, 6]} />
          <meshStandardMaterial color="#ffb347" emissive="#ff9a2c" emissiveIntensity={1.4} transparent opacity={0.75} />
        </mesh>
        <mesh position={[0, 0.16, 0]}>
          <coneGeometry args={[0.15, 0.08, 6]} />
          <Metal color="#2a2a2a" roughness={0.7} />
        </mesh>
        <mesh position={[0, -0.15, 0]}>
          <cylinderGeometry args={[0.12, 0.1, 0.03, 6]} />
          <Metal color="#2a2a2a" roughness={0.7} />
        </mesh>
        <pointLight color="#ffa64d" intensity={1.8} distance={5} decay={2} />
      </group>

      <Barkeep />

      {/* patrons, in descending order of coordination: one up and dancing
          on the open floor by the bar, one weaving beside the stool he
          fell off, one face-down on the counter */}
      <Dancer position={[3.6, 0, -2.45]} rotation={-0.95} />
      <group position={[4.95, 0, -1.2]} rotation={[0, Math.PI / 2, 0]}>
        <Stool seatY={0.62} r={0.21} />
      </group>
      <Staggerer position={[4.45, 0, -0.4]} rotation={-1.4} seed={1.7} />
      <SlumpedDrunk position={[4.95, 0, 0.75]} />

      {/* the evening's casualties: tankards and bottles across the counter */}
      <Tankard position={[5.6, 1.185, -1.65]} />
      <Tankard position={[5.85, 1.17, -1.4]} tipped />
      <Tankard position={[5.7, 1.185, -0.75]} glass />
      <Tankard position={[5.95, 1.185, -0.5]} />
      <Bottle position={[5.6, 1.11, -0.25]} color="#3f5a2e" />
      <Tankard position={[5.85, 1.185, 0.05]} />
      <Tankard position={[5.6, 1.185, 0.3]} />
      <Bottle position={[5.95, 1.11, 0.45]} color="#5a2e2e" height={0.22} />
      <Tankard position={[5.65, 1.185, 1.1]} glass />
      <Tankard position={[5.9, 1.17, 1.3]} tipped rotation={1} />
      {/* spill */}
      <mesh position={[5.8, 1.112, -1.25]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.6, 1, 1]}>
        <circleGeometry args={[0.1, 12]} />
        <meshStandardMaterial color="#8a6a2e" roughness={0.1} transparent opacity={0.6} />
      </mesh>

      {/* jar of pickled eggs at the end of the bar */}
      <PickledEggJar position={[5.75, 1.11, 1.7]} />
    </group>
  );
}

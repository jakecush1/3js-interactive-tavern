import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import type { Instrument as InstrumentType } from "../data/bandMembers";

// INSTRUMENT
// Procedural low-poly instruments built from primitives.
// To use a real model later: replace the returned JSX for a given type
// with a <primitive object={gltf.scene} /> loaded via useGLTF.

type Props = {
  type: InstrumentType;
  playing: boolean;
  intensity: number; // 0..1 animation energy (tied to song mood/bpm)
};

export default function Instrument({ type, playing, intensity }: Props) {
  const ref = useRef<Group>(null);

  useFrame((state) => {
    if (!ref.current) return;
    if (type === "organ") return; // furniture doesn't rock
    const t = state.clock.elapsedTime;
    if (playing) {
      // subtle instrument motion while playing
      ref.current.rotation.z = Math.sin(t * 6 * (0.5 + intensity)) * 0.05 * intensity;
    } else {
      ref.current.rotation.z = Math.sin(t * 1.2) * 0.01;
    }
  });

  return <group ref={ref}>{renderInstrument(type)}</group>;
}

function renderInstrument(type: InstrumentType) {
  switch (type) {
    case "lute":
      return (
        <group rotation={[0.3, 0, -0.4]} position={[0.15, 0.05, 0.25]}>
          {/* body — dark bowl back, pale spruce soundboard (like the refs) */}
          <mesh>
            <sphereGeometry args={[0.18, 16, 12]} />
            <meshStandardMaterial color="#6e4018" roughness={0.55} />
          </mesh>
          <mesh position={[0, 0.02, 0.165]}>
            <circleGeometry args={[0.135, 16]} />
            <meshStandardMaterial color="#d9c29a" roughness={0.7} />
          </mesh>
          {/* soundhole */}
          <mesh position={[0, 0.02, 0.172]}>
            <circleGeometry args={[0.05, 16]} />
            <meshStandardMaterial color="#1a0e05" />
          </mesh>
          {/* neck */}
          <mesh position={[0, 0.32, 0]}>
            <boxGeometry args={[0.05, 0.5, 0.05]} />
            <meshStandardMaterial color="#5a3416" roughness={0.6} />
          </mesh>
          {/* pegbox */}
          <mesh position={[0, 0.6, 0]} rotation={[0.4, 0, 0]}>
            <boxGeometry args={[0.07, 0.12, 0.05]} />
            <meshStandardMaterial color="#3d2410" />
          </mesh>
        </group>
      );
    case "fiddle":
      return (
        <group rotation={[0, 0, 0.5]} position={[0.2, 0.25, 0.15]}>
          {/* body */}
          <mesh>
            <boxGeometry args={[0.16, 0.32, 0.06]} />
            <meshStandardMaterial color="#8a3a1e" roughness={0.5} />
          </mesh>
          {/* neck */}
          <mesh position={[0, 0.28, 0]}>
            <boxGeometry args={[0.04, 0.28, 0.04]} />
            <meshStandardMaterial color="#5a2814" />
          </mesh>
          {/* bow */}
          <mesh position={[0.18, 0.05, 0.1]} rotation={[0, 0, 1.4]}>
            <cylinderGeometry args={[0.008, 0.008, 0.5, 6]} />
            <meshStandardMaterial color="#d8c8a8" />
          </mesh>
        </group>
      );
    case "drum":
      return (
        <group position={[0, 0.05, 0.3]} rotation={[1.2, 0, 0]}>
          {/* drum shell */}
          <mesh>
            <cylinderGeometry args={[0.26, 0.26, 0.12, 20]} />
            <meshStandardMaterial color="#6b4423" roughness={0.7} />
          </mesh>
          {/* skin */}
          <mesh position={[0, 0.061, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.255, 20]} />
            <meshStandardMaterial color="#d9c2a0" roughness={0.8} />
          </mesh>
        </group>
      );
    case "bass":
      return (
        // Upright bass standing beside the player, endpin on the floor
        <group position={[0.38, -0.55, 0.3]} rotation={[0, -0.45, 0.1]}>
          {/* body */}
          <mesh position={[0, 0.62, 0]} scale={[0.75, 1.15, 0.4]}>
            <sphereGeometry args={[0.3, 16, 12]} />
            <meshStandardMaterial color="#6b3a16" roughness={0.55} />
          </mesh>
          {/* soundhole */}
          <mesh position={[0.05, 0.6, 0.12]}>
            <circleGeometry args={[0.045, 12]} />
            <meshStandardMaterial color="#1a0e05" />
          </mesh>
          {/* bridge */}
          <mesh position={[0, 0.55, 0.125]}>
            <boxGeometry args={[0.09, 0.05, 0.02]} />
            <meshStandardMaterial color="#3d2410" />
          </mesh>
          {/* neck */}
          <mesh position={[0, 1.3, -0.01]}>
            <boxGeometry args={[0.05, 0.72, 0.05]} />
            <meshStandardMaterial color="#5a3416" roughness={0.6} />
          </mesh>
          {/* scroll */}
          <mesh position={[0, 1.7, 0]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshStandardMaterial color="#3d2410" />
          </mesh>
          {/* strings */}
          <mesh position={[0, 1.05, 0.045]} rotation={[0.07, 0, 0]}>
            <boxGeometry args={[0.035, 1.3, 0.003]} />
            <meshStandardMaterial color="#d8c8a8" metalness={0.4} roughness={0.4} />
          </mesh>
          {/* endpin */}
          <mesh position={[0, 0.14, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.3, 6]} />
            <meshStandardMaterial color="#2a2a2a" metalness={0.7} roughness={0.4} />
          </mesh>
        </group>
      );
    case "organ":
      return (
        // Cathedral organ console: the player faces it, back to the room.
        <group position={[0, -0.55, 0.55]}>
          {/* console body */}
          <mesh position={[0, 0.5, 0.1]}>
            <boxGeometry args={[1.5, 1.0, 0.5]} />
            <meshStandardMaterial color="#3d2817" roughness={0.7} />
          </mesh>
          {/* keyboard shelf facing the player */}
          <mesh position={[0, 0.66, -0.2]}>
            <boxGeometry args={[1.05, 0.05, 0.16]} />
            <meshStandardMaterial color="#e8dcc0" roughness={0.5} />
          </mesh>
          {/* black keys */}
          {[-0.4, -0.28, -0.16, -0.04, 0.08, 0.2, 0.32].map((x, i) => (
            <mesh key={i} position={[x, 0.695, -0.22]}>
              <boxGeometry args={[0.05, 0.02, 0.08]} />
              <meshStandardMaterial color="#1a120a" />
            </mesh>
          ))}
          {/* crown rail */}
          <mesh position={[0, 1.05, 0.15]}>
            <boxGeometry args={[1.45, 0.1, 0.4]} />
            <meshStandardMaterial color="#2a1c10" roughness={0.7} />
          </mesh>
          {/* pipe crown — tallest in the center, church style */}
          {(
            [
              [-0.6, 0.8],
              [-0.45, 1.05],
              [-0.3, 1.3],
              [-0.15, 1.55],
              [0, 1.8],
              [0.15, 1.55],
              [0.3, 1.3],
              [0.45, 1.05],
              [0.6, 0.8],
            ] as const
          ).map(([x, h], i) => (
            <mesh key={i} position={[x, 1.1 + h / 2, 0.15]}>
              <cylinderGeometry args={[0.055, 0.055, h, 10]} />
              <meshStandardMaterial color="#c8a24b" metalness={0.65} roughness={0.3} />
            </mesh>
          ))}
          {/* THE CHAIN — anchor chain percussion, hung off the console side */}
          <mesh position={[-0.8, 1.02, -0.05]}>
            <boxGeometry args={[0.06, 0.05, 0.06]} />
            <meshStandardMaterial color="#2a1c10" />
          </mesh>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <mesh
              key={i}
              position={[-0.8, 0.94 - i * 0.085, -0.05]}
              rotation={[i % 2 ? Math.PI / 2 : 0, 0, 0]}
            >
              <torusGeometry args={[0.034, 0.012, 6, 10]} />
              <meshStandardMaterial color="#8a8578" metalness={0.8} roughness={0.4} />
            </mesh>
          ))}
          {/* spare flute resting on the console top — carved wood, per refs */}
          <mesh position={[0.38, 1.04, -0.1]} rotation={[0, 0.5, Math.PI / 2]}>
            <cylinderGeometry args={[0.025, 0.03, 0.6, 12]} />
            <meshStandardMaterial color="#7a4a26" roughness={0.6} />
          </mesh>
        </group>
      );
    case "flute":
      return (
        <group rotation={[0, 0, -1.4]} position={[0.18, 0.28, 0.2]}>
          <mesh>
            <cylinderGeometry args={[0.025, 0.03, 0.6, 12]} />
            <meshStandardMaterial color="#c8a24b" roughness={0.4} metalness={0.3} />
          </mesh>
          {/* holes */}
          {[-0.15, -0.05, 0.05, 0.15].map((y, i) => (
            <mesh key={i} position={[0.028, y, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.008, 0.008, 0.02, 6]} />
              <meshStandardMaterial color="#2a1c0c" />
            </mesh>
          ))}
        </group>
      );
  }
}

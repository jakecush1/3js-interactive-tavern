import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Matrix4 } from "three";
import type { Group, InstancedMesh } from "three";
import type { Instrument as InstrumentType } from "../data/bandMembers";
import { Cloth, Metal, Wood } from "./characters/materials";

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
    if (type === "piano") return; // furniture doesn't rock
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
    case "piano":
      return (
        // Little spinet piano in front of the player — apartment-sized, the
        // case barely taller than the keys. Joan sits side-on to the room (see
        // bandMembers.ts), so the audience sees the case and the protruding
        // keyboard in profile; local +x is the audience side,
        // -z is the player. Floor is y = 0.
        <group position={[0, -0.55, 0.55]}>
          {/* plinth / toe rail */}
          <mesh position={[0, 0.04, 0.14]}>
            <boxGeometry args={[1.52, 0.08, 0.44]} />
            <Wood base="#4a3018" dark="#1a0e04" planks={1} />
          </mesh>
          {/* lower case: kneeboard between the legs */}
          <mesh position={[0, 0.35, 0.15]}>
            <boxGeometry args={[1.5, 0.54, 0.4]} />
            <Wood base="#5a3b20" dark="#1f1206" planks={2} />
          </mesh>
          {/* front legs / pilasters under the key cheeks */}
          {[-0.68, 0.68].map((x) => (
            <mesh key={x} position={[x, 0.31, -0.1]}>
              <boxGeometry args={[0.14, 0.62, 0.3]} />
              <Wood base="#5a3b20" dark="#1f1206" planks={1} />
            </mesh>
          ))}
          {/* keybed, jutting out toward the player */}
          <mesh position={[0, 0.66, -0.11]}>
            <boxGeometry args={[1.5, 0.08, 0.32]} />
            <Wood base="#5a3b20" dark="#1f1206" planks={2} />
          </mesh>
          {/* key cheeks framing the keyboard */}
          {[-0.69, 0.69].map((x) => (
            <mesh key={x} position={[x, 0.73, -0.11]}>
              <boxGeometry args={[0.12, 0.06, 0.32]} />
              <Wood base="#5a3b20" dark="#1f1206" planks={1} />
            </mesh>
          ))}
          {/* yellowed ivory keys */}
          <mesh position={[0, 0.7125, -0.135]}>
            <boxGeometry args={[1.26, 0.025, 0.25]} />
            <meshStandardMaterial color="#e8dcc0" roughness={0.5} />
          </mesh>
          <BlackKeys keyWidth={1.26 / 28} octaves={4} y={0.735} z={-0.09} />
          {/* fallboard, folded open against the upper panel */}
          <mesh position={[0, 0.8, -0.07]} rotation={[-0.12, 0, 0]}>
            <boxGeometry args={[1.3, 0.12, 0.03]} />
            <Wood base="#5a3b20" dark="#1f1206" planks={1} />
          </mesh>
          {/* music ledge */}
          <mesh position={[0, 0.865, -0.08]}>
            <boxGeometry args={[1.3, 0.03, 0.08]} />
            <Wood base="#4a3018" dark="#1a0e04" planks={1} />
          </mesh>
          {/* upper case */}
          <mesh position={[0, 0.83, 0.15]}>
            <boxGeometry args={[1.5, 0.3, 0.4]} />
            <Wood base="#5a3b20" dark="#1f1206" planks={2} />
          </mesh>
          {/* fretwork panels: faded silk behind carved slats */}
          {[-0.36, 0.36].map((x) => (
            <group key={x} position={[x, 0.92, -0.055]}>
              <mesh>
                <boxGeometry args={[0.5, 0.08, 0.02]} />
                <Cloth color="#6a2226" />
              </mesh>
              {[-0.15, 0, 0.15].map((sx) => (
                <mesh key={sx} position={[sx, 0, 0.012]}>
                  <boxGeometry args={[0.04, 0.08, 0.02]} />
                  <Wood base="#4a3018" dark="#1a0e04" planks={1} />
                </mesh>
              ))}
            </group>
          ))}
          {/* cornice moulding under the lid */}
          <mesh position={[0, 0.965, -0.06]}>
            <boxGeometry args={[1.5, 0.04, 0.03]} />
            <Wood base="#4a3018" dark="#1a0e04" planks={1} />
          </mesh>
          {/* top lid, slight overhang */}
          <mesh position={[0, 1.005, 0.14]}>
            <boxGeometry args={[1.56, 0.05, 0.46]} />
            <Wood base="#5a3b20" dark="#1f1206" planks={2} />
          </mesh>
          {/* brass candlesticks on the lid */}
          {[-0.52, 0.52].map((x) => (
            <group key={x} position={[x, 1.03, 0.02]}>
              <mesh position={[0, 0.015, -0.08]}>
                <cylinderGeometry args={[0.035, 0.022, 0.03, 10]} />
                <Metal color="#b8923a" roughness={0.35} metalness={0.85} />
              </mesh>
              <mesh position={[0, 0.09, -0.08]}>
                <cylinderGeometry args={[0.016, 0.02, 0.12, 8]} />
                <meshStandardMaterial color="#e8dcc0" roughness={0.6} />
              </mesh>
              <mesh position={[0, 0.19, -0.08]}>
                <coneGeometry args={[0.02, 0.07, 8]} />
                <meshBasicMaterial color="#ffce6b" />
              </mesh>
            </group>
          ))}
          {/* brass pedals */}
          {[-0.07, 0.07].map((x) => (
            <mesh key={x} position={[x, 0.08, -0.13]} rotation={[-0.3, 0, 0]}>
              <boxGeometry args={[0.04, 0.015, 0.14]} />
              <Metal color="#b8923a" roughness={0.35} metalness={0.85} />
            </mesh>
          ))}
          {/* THE CHAIN — anchor chain percussion, hung off the audience end
              of the case so it stays in view */}
          <mesh position={[0.78, 0.95, 0.05]}>
            <boxGeometry args={[0.06, 0.05, 0.06]} />
            <Wood base="#4a3018" dark="#1a0e04" planks={1} />
          </mesh>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <mesh
              key={i}
              position={[0.78, 0.87 - i * 0.085, 0.05]}
              rotation={[i % 2 ? Math.PI / 2 : 0, 0, 0]}
            >
              <torusGeometry args={[0.034, 0.012, 6, 10]} />
              <Metal color="#8a8578" roughness={0.4} metalness={0.8} />
            </mesh>
          ))}
          {/* spare flute resting on the lid — carved wood, per refs */}
          <mesh position={[-0.38, 1.06, 0.1]} rotation={[0, -0.5, Math.PI / 2]}>
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

// Black keys as a single instanced mesh: five per octave (C# D# F# G# A#),
// each sitting on the boundary between two white keys.
function BlackKeys({ keyWidth, octaves, y, z }: { keyWidth: number; octaves: number; y: number; z: number }) {
  const ref = useRef<InstancedMesh>(null);
  const xs = useMemo(() => {
    const out: number[] = [];
    const octaveW = keyWidth * 7;
    const startX = -(octaves * octaveW) / 2;
    for (let o = 0; o < octaves; o++) {
      for (const k of [1, 2, 4, 5, 6]) out.push(startX + o * octaveW + k * keyWidth);
    }
    return out;
  }, [keyWidth, octaves]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new Matrix4();
    xs.forEach((x, i) => {
      m.makeTranslation(x, 0, 0);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [xs]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, xs.length]} position={[0, y, z]}>
      <boxGeometry args={[keyWidth * 0.55, 0.02, 0.14]} />
      <meshStandardMaterial color="#1a120a" roughness={0.5} />
    </instancedMesh>
  );
}

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { Group } from "three";
import type { ClickableObject as ClickableObjectData } from "../data/clickableObjects";
import { useGameStore } from "../lib/useGameStore";

// CLICKABLE OBJECT
// Glowing interactive props that trigger songs. Each kind renders different
// primitive geometry. Hover = scale bounce + glow + tooltip.

type Props = { object: ClickableObjectData };

export default function ClickableObject({ object }: Props) {
  const group = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);
  const selectSong = useGameStore((s) => s.selectSong);
  const currentSongId = useGameStore((s) => s.currentSongId);
  const reducedMotion = useGameStore((s) => s.reducedMotion);

  const isActive = object.songId === currentSongId;

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    const targetScale = hovered ? 1.18 : 1;
    const base = object.scale ?? 1;
    // smooth scale
    const cur = group.current.scale.x / base;
    const next = cur + (targetScale - cur) * 0.15;
    group.current.scale.setScalar(next * base);

    // gentle float for glowing trigger props (not furniture/ground pieces)
    if (object.kind !== "keg" && object.kind !== "bread" && !reducedMotion) {
      group.current.position.y =
        object.position[1] + Math.sin(t * 2 + object.position[0]) * 0.03;
    }
  });

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (object.action === "play-song" && object.songId) {
      selectSong(object.songId);
    }
  };

  const glow = hovered || isActive;
  const glowColor = isActive ? "#ffd97a" : "#e7c66a";

  return (
    <group
      ref={group}
      position={object.position}
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "auto";
      }}
    >
      {renderKind(object, glow, glowColor)}

      {/* glow halo */}
      {glow && <pointLight color={glowColor} intensity={1.2} distance={1.6} />}

      {hovered && (
        <Html
          position={[0, object.kind === "keg" ? 1.55 : 0.5, 0]}
          center
          distanceFactor={9}
        >
          <div className="pointer-events-none whitespace-nowrap border-2 border-tavern-gold bg-tavern-shadow/95 px-2.5 py-1 text-[11px] text-tavern-linen font-mono uppercase tracking-wider shadow-brutal-cobalt">
            {object.label}
          </div>
        </Html>
      )}
    </group>
  );
}

function renderKind(
  object: ClickableObjectData,
  glow: boolean,
  glowColor: string
) {
  const emissiveIntensity = glow ? 0.7 : 0.25;

  switch (object.kind) {
    case "scroll":
      return (
        <group rotation={[0, 0.3, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.06, 0.06, 0.34, 12]} />
            <meshStandardMaterial
              color="#e8d8a8"
              emissive={glowColor}
              emissiveIntensity={emissiveIntensity}
              roughness={0.6}
            />
          </mesh>
          {/* ribbon */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.062, 0.012, 8, 16]} />
            <meshStandardMaterial color="#6b1f2a" />
          </mesh>
        </group>
      );
    case "goblet":
      return (
        <group>
          {/* cup */}
          <mesh position={[0, 0.08, 0]}>
            <cylinderGeometry args={[0.08, 0.05, 0.16, 12]} />
            <meshStandardMaterial
              color="#c9a24b"
              metalness={0.6}
              roughness={0.3}
              emissive={glowColor}
              emissiveIntensity={emissiveIntensity}
            />
          </mesh>
          {/* stem */}
          <mesh position={[0, -0.04, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.08, 8]} />
            <meshStandardMaterial color="#9a7d35" metalness={0.6} roughness={0.4} />
          </mesh>
          {/* base */}
          <mesh position={[0, -0.09, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 0.02, 12]} />
            <meshStandardMaterial color="#9a7d35" metalness={0.6} roughness={0.4} />
          </mesh>
        </group>
      );
    case "barrel":
      return (
        <group scale={0.9}>
          <mesh>
            <cylinderGeometry args={[0.45, 0.4, 1.0, 16]} />
            <meshStandardMaterial
              color="#5a3a1d"
              roughness={0.8}
              emissive={glowColor}
              emissiveIntensity={glow ? 0.4 : 0}
            />
          </mesh>
          {[-0.3, 0, 0.3].map((y, i) => (
            <mesh key={i} position={[0, y, 0]}>
              <torusGeometry args={[0.46, 0.025, 8, 24]} />
              <meshStandardMaterial color="#3a3a3a" metalness={0.6} roughness={0.5} />
            </mesh>
          ))}
          {/* glowing tap */}
          <mesh position={[0, -0.1, 0.45]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.15, 8]} />
            <meshStandardMaterial
              color="#c9a24b"
              emissive={glowColor}
              emissiveIntensity={emissiveIntensity}
            />
          </mesh>
        </group>
      );
    case "keg":
      // Giant old-style mead keg on a rustic side table (origin at floor)
      return (
        <group>
          {/* table leg + top */}
          <mesh position={[0, 0.25, 0]}>
            <cylinderGeometry args={[0.09, 0.13, 0.5, 8]} />
            <meshStandardMaterial color="#3d2817" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.53, 0]} receiveShadow>
            <cylinderGeometry args={[0.52, 0.52, 0.07, 16]} />
            <meshStandardMaterial color="#5c3d22" roughness={0.7} />
          </mesh>
          {/* keg body — dark aged oak, bulged staves */}
          <mesh position={[0, 0.92, 0]}>
            <cylinderGeometry args={[0.26, 0.3, 0.68, 14]} />
            <meshStandardMaterial
              color="#4a2f16"
              roughness={0.9}
              emissive={glowColor}
              emissiveIntensity={glow ? 0.35 : 0}
            />
          </mesh>
          {/* stave seams — ridges around the barrel, leaning with the taper */}
          {Array.from({ length: 14 }, (_, i) => {
            const a = (i / 14) * Math.PI * 2;
            return (
              <group key={i} rotation={[0, -a, 0]}>
                <mesh position={[0.285, 0.92, 0]} rotation={[0, 0, 0.06]}>
                  <boxGeometry args={[0.02, 0.64, 0.02]} />
                  <meshStandardMaterial color="#33200e" roughness={0.95} />
                </mesh>
              </group>
            );
          })}
          {/* iron hoops */}
          {[
            [0.66, 0.295],
            [0.92, 0.28],
            [1.18, 0.265],
          ].map(([y, r], i) => (
            <mesh key={i} position={[0, y, 0]}>
              <torusGeometry args={[r, 0.018, 8, 24]} />
              <meshStandardMaterial color="#3a3a3a" metalness={0.6} roughness={0.5} />
            </mesh>
          ))}
          {/* lid + bung */}
          <mesh position={[0, 1.265, 0]}>
            <cylinderGeometry args={[0.25, 0.25, 0.03, 14]} />
            <meshStandardMaterial color="#3a2410" roughness={0.85} />
          </mesh>
          <mesh position={[0, 1.3, 0]}>
            <cylinderGeometry args={[0.04, 0.05, 0.05, 8]} />
            <meshStandardMaterial color="#3d2410" />
          </mesh>
          {/* glowing brass spigot facing the room */}
          <mesh position={[0, 0.72, 0.3]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.16, 8]} />
            <meshStandardMaterial
              color="#c9a24b"
              emissive={glowColor}
              emissiveIntensity={emissiveIntensity}
            />
          </mesh>
          <mesh position={[0, 0.79, 0.36]}>
            <boxGeometry args={[0.03, 0.08, 0.03]} />
            <meshStandardMaterial color="#c9a24b" metalness={0.5} roughness={0.4} />
          </mesh>
        </group>
      );
    case "coinbag":
      // Bulging leather pouch spilling gold coins (origin on tabletop)
      return (
        <group>
          {/* pouch body */}
          <mesh position={[0, 0.11, 0]} scale={[1, 0.85, 1]}>
            <sphereGeometry args={[0.14, 12, 10]} />
            <meshStandardMaterial
              color="#6b4a2a"
              roughness={0.9}
              emissive={glowColor}
              emissiveIntensity={glow ? 0.3 : 0.05}
            />
          </mesh>
          {/* cinched neck + tie */}
          <mesh position={[0, 0.24, 0]}>
            <cylinderGeometry args={[0.045, 0.06, 0.07, 8]} />
            <meshStandardMaterial color="#4a3016" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.245, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.05, 0.012, 6, 12]} />
            <meshStandardMaterial color="#8a5a26" roughness={0.8} />
          </mesh>
          {/* coins spilling on top and around the base */}
          {(
            [
              [0.02, 0.29, 0.01, 0.3],
              [0.14, 0.02, 0.1, 0.1],
              [-0.16, 0.02, 0.06, 0.5],
              [0.1, 0.02, -0.13, 0.8],
              [-0.08, 0.02, -0.15, 0.2],
              [0.2, 0.02, -0.03, 0.6],
            ] as const
          ).map(([x, y, z, rot], i) => (
            <mesh key={i} position={[x, y, z]} rotation={[rot * 0.3, rot, 0]}>
              <cylinderGeometry args={[0.032, 0.032, 0.01, 10]} />
              <meshStandardMaterial
                color="#d9a929"
                metalness={0.75}
                roughness={0.3}
                emissive={glowColor}
                emissiveIntensity={glow ? 0.4 : 0.12}
              />
            </mesh>
          ))}
        </group>
      );
    case "bread":
      // Pile of rustic scored loaves on a board (origin on the ground)
      return (
        <group rotation={[0, 0.5, 0]}>
          {/* board */}
          <mesh position={[0, 0.025, 0]} receiveShadow>
            <cylinderGeometry args={[0.34, 0.34, 0.04, 14]} />
            <meshStandardMaterial color="#4a3016" roughness={0.8} />
          </mesh>
          {/* loaves — oval boules of varying size */}
          {(
            [
              [0, 0.15, -0.05, 1.25, 0.2],
              [-0.17, 0.12, 0.13, 0.9, 1.1],
              [0.18, 0.12, 0.11, 0.85, -0.8],
              [0.02, 0.29, -0.03, 0.75, 2.0],
            ] as const
          ).map(([x, y, z, s, rot], i) => (
            <group key={i} position={[x, y, z]} rotation={[0, rot, 0]} scale={s}>
              <mesh scale={[1.35, 0.75, 1]}>
                <sphereGeometry args={[0.11, 14, 12]} />
                <meshStandardMaterial
                  color={i % 2 === 0 ? "#a86f2e" : "#96601f"}
                  roughness={0.85}
                  emissive={glowColor}
                  emissiveIntensity={glow ? 0.35 : 0.05}
                />
              </mesh>
              {/* score marks across the crust */}
              {[-0.05, 0.03].map((x2, j) => (
                <mesh key={j} position={[x2, 0.075, 0]} rotation={[0, 0, 0.15]}>
                  <boxGeometry args={[0.015, 0.012, 0.15]} />
                  <meshStandardMaterial color="#e8d5a0" roughness={0.9} />
                </mesh>
              ))}
            </group>
          ))}
        </group>
      );
    case "candle":
      return (
        <mesh>
          <cylinderGeometry args={[0.05, 0.06, 0.24, 8]} />
          <meshStandardMaterial
            color="#e8dcc0"
            emissive={glowColor}
            emissiveIntensity={emissiveIntensity}
          />
        </mesh>
      );
  }
}

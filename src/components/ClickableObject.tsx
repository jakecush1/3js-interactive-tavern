import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { LatheGeometry, Vector2, type Group } from "three";
import { woodTexture } from "../lib/textures";
import { Metal, Wood } from "./characters/materials";
import type { ClickableObject as ClickableObjectData } from "../data/clickableObjects";
import { useGameStore } from "../lib/useGameStore";
import { glowAnchors } from "../lib/glow";

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

  // The playing song's trigger keeps the shared "active" glow light.
  useEffect(() => {
    const me = group.current;
    if (isActive) glowAnchors.active = me;
    return () => {
      if (glowAnchors.active === me) glowAnchors.active = null;
    };
  }, [isActive]);

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
        glowAnchors.hover = group.current;
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        if (glowAnchors.hover === group.current) glowAnchors.hover = null;
        document.body.style.cursor = "auto";
      }}
    >
      {renderKind(object, glow, glowColor)}

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
      return <Keg glowColor={glowColor} glow={glow} emissiveIntensity={emissiveIntensity} />;
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

// MEAD KEG
// A coopered oak barrel standing on a stout trestle: bulged staves turned
// from a lathe profile, four pitted iron hoops, a lid with a bung and a
// mallet, a brass tap at the bottom with a bowl under the drip, and a full
// tankard waiting on the lid. Origin at the floor.
function Keg({ glowColor, glow, emissiveIntensity }: { glowColor: string; glow: boolean; emissiveIntensity: number }) {
  const barrel = useMemo(() => {
    const prof: [number, number][] = [
      [0.0, 0], [0.24, 0], [0.26, 0.02], [0.285, 0.12], [0.305, 0.28], [0.31, 0.42], [0.305, 0.56], [0.285, 0.72], [0.26, 0.82], [0.24, 0.84], [0.0, 0.84],
    ];
    return new LatheGeometry(prof.map(([x, y]) => new Vector2(x, y)), 20);
  }, []);
  const staves = useMemo(() => woodTexture({ base: "#5a3a1d", dark: "#1a0e04", planks: 10, repeat: [1, 1] }), []);
  const hoops: [number, number][] = [
    [0.09, 0.282],
    [0.3, 0.306],
    [0.56, 0.306],
    [0.76, 0.28],
  ];
  const standY = 0.36;
  return (
    <group>
      {/* trestle stand: two slabs on angled legs with a stretcher */}
      {[-0.22, 0.22].map((z) => (
        <group key={z} position={[0, 0, z]}>
          <mesh position={[0, standY - 0.035, 0]}>
            <boxGeometry args={[0.78, 0.07, 0.12]} />
            <Wood base="#4a3018" dark="#1a0e04" planks={1} />
          </mesh>
          {[-0.3, 0.3].map((x) => (
            <mesh key={x} position={[x, (standY - 0.07) / 2, 0]} rotation={[0, 0, x > 0 ? -0.14 : 0.14]}>
              <boxGeometry args={[0.07, standY - 0.07, 0.1]} />
              <Wood base="#4a3018" dark="#1a0e04" planks={1} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[0, 0.12, 0]}>
        <boxGeometry args={[0.5, 0.05, 0.5]} />
        <Wood base="#4a3018" dark="#1a0e04" planks={1} />
      </mesh>
      {/* the barrel */}
      <group position={[0, standY, 0]}>
        <mesh geometry={barrel} castShadow>
          <meshStandardMaterial map={staves} bumpMap={staves} bumpScale={0.8} roughness={0.85} emissive={glowColor} emissiveIntensity={glow ? 0.3 : 0} />
        </mesh>
        {/* stave seams */}
        {Array.from({ length: 16 }, (_, i) => {
          const a = (i / 16) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.3, 0.42, Math.sin(a) * 0.3]} rotation={[0, -a, 0]}>
              <boxGeometry args={[0.012, 0.7, 0.014]} />
              <meshStandardMaterial color="#2a1808" roughness={0.95} />
            </mesh>
          );
        })}
        {/* iron hoops, riveted */}
        {hoops.map(([y, r], i) => (
          <group key={i} position={[0, y, 0]}>
            <mesh>
              <torusGeometry args={[r + 0.012, 0.016, 8, 32]} />
              <Metal color="#33312e" roughness={0.65} metalness={0.6} />
            </mesh>
            {[0, 1, 2, 3].map((k) => (
              <mesh key={k} position={[Math.cos(k * 1.57 + 0.4) * (r + 0.026), 0, Math.sin(k * 1.57 + 0.4) * (r + 0.026)]}>
                <sphereGeometry args={[0.008, 6, 6]} />
                <Metal color="#55514a" roughness={0.5} metalness={0.7} />
              </mesh>
            ))}
          </group>
        ))}
        {/* lid: planked head with a bung and a mallet left on it */}
        <mesh position={[0, 0.845, 0]}>
          <cylinderGeometry args={[0.235, 0.235, 0.02, 20]} />
          <Wood base="#4e3118" dark="#1a0e04" planks={5} />
        </mesh>
        <mesh position={[0.05, 0.875, -0.03]}>
          <cylinderGeometry args={[0.03, 0.04, 0.04, 8]} />
          <Wood base="#3a2410" dark="#1a0e04" planks={1} />
        </mesh>
        <group position={[-0.1, 0.87, 0.08]} rotation={[0, 0.6, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.012, 0.012, 0.22, 6]} />
            <Wood base="#6a4a26" dark="#2a1708" planks={1} />
          </mesh>
          <mesh position={[0.1, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.07, 8]} />
            <Wood base="#4a3018" dark="#1a0e04" planks={1} />
          </mesh>
        </group>
        {/* full tankard on the lid */}
        <group position={[0.1, 0.855, 0.1]}>
          <mesh position={[0, 0.07, 0]}>
            <cylinderGeometry args={[0.045, 0.055, 0.14, 12]} />
            <Wood base="#8a6a3e" dark="#2a1a08" planks={6} />
          </mesh>
          <mesh position={[0, 0.145, 0]} scale={[1, 0.5, 1]}>
            <sphereGeometry args={[0.048, 10, 8]} />
            <meshStandardMaterial color="#f0ead8" roughness={0.9} />
          </mesh>
          <mesh position={[0.058, 0.07, 0]}>
            <torusGeometry args={[0.03, 0.009, 6, 12, Math.PI]} />
            <meshStandardMaterial color="#5a3a1c" roughness={0.6} />
          </mesh>
        </group>
        {/* brass tap at the front, glowing when hovered, with a bowl under the drip */}
        <group position={[0, 0.13, 0.26]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.07]}>
            <cylinderGeometry args={[0.022, 0.026, 0.16, 10]} />
            <meshStandardMaterial color="#c9a24b" metalness={0.7} roughness={0.35} emissive={glowColor} emissiveIntensity={emissiveIntensity} />
          </mesh>
          <mesh position={[0, -0.05, 0.14]} rotation={[0.3, 0, 0]}>
            <cylinderGeometry args={[0.012, 0.016, 0.07, 8]} />
            <meshStandardMaterial color="#c9a24b" metalness={0.7} roughness={0.35} emissive={glowColor} emissiveIntensity={emissiveIntensity} />
          </mesh>
          <mesh position={[0, 0.045, 0.1]} rotation={[0, 0, 0.4]}>
            <boxGeometry args={[0.07, 0.016, 0.02]} />
            <meshStandardMaterial color="#c9a24b" metalness={0.7} roughness={0.35} />
          </mesh>
        </group>
      </group>
      <mesh position={[0, standY - 0.05, 0.42]}>
        <cylinderGeometry args={[0.07, 0.05, 0.05, 12, 1, true]} />
        <meshStandardMaterial color="#8c8f96" metalness={0.6} roughness={0.5} side={2} />
      </mesh>
    </group>
  );
}

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { TextureLoader, SRGBColorSpace, CanvasTexture } from "three";
import type { Group, Mesh, MeshBasicMaterial, PointLight, Sprite, SpriteMaterial } from "three";
import { useGameStore } from "../lib/useGameStore";
import { useIsMobile } from "../lib/useMedia";
import { bannerTexture, plasterTexture, rugTexture, stoneTexture, windowTexture, woodTexture } from "../lib/textures";
import { Metal, Wood } from "./characters/materials";
import { Bottle, Jug } from "./Bar";

// TAVERN ENVIRONMENT
// All static set dressing. Every surface is textured procedurally (see
// src/lib/textures.ts): plank floor and ceiling, half-timbered plaster
// walls over a stone skirting, a coursed-stone hearth, a woven rug,
// heraldic banners, leaded windows. Plus the clutter that makes a room
// feel lived in: an iron chandelier, wall sconces, a trestle table laid
// for supper, barrels, crates, firewood, herbs drying from the rafters,
// and the framed old masters from /public/artwork.

function WallPainting({
  url,
  position,
  rotation = [0, 0, 0],
  width = 1.35,
  height = 1.8,
  crop,
  framed = true,
}: {
  url: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  width?: number;
  height?: number;
  crop?: { repeat: [number, number]; offset: [number, number] };
  framed?: boolean;
}) {
  const tex = useLoader(TextureLoader, url);
  useEffect(() => {
    tex.colorSpace = SRGBColorSpace;
    if (crop) {
      tex.repeat.set(crop.repeat[0], crop.repeat[1]);
      tex.offset.set(crop.offset[0], crop.offset[1]);
    }
    tex.needsUpdate = true;
  }, [tex, crop]);

  return (
    <group position={position} rotation={rotation}>
      {framed && (
        <>
          <mesh>
            <boxGeometry args={[width + 0.24, height + 0.24, 0.08]} />
            <Wood base="#2a1a0c" dark="#0a0502" planks={1} roughness={0.5} />
          </mesh>
          <mesh>
            <boxGeometry args={[width + 0.1, height + 0.1, 0.09]} />
            <Metal color="#b8923a" metalness={0.7} roughness={0.35} />
          </mesh>
        </>
      )}
      <mesh position={[0, 0, 0.056]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial map={tex} roughness={0.9} />
      </mesh>
    </group>
  );
}

function Flame({ size = 1 }: { size?: number }) {
  const ref = useRef<Mesh>(null);
  const reducedMotion = useGameStore((s) => s.reducedMotion);
  const seed = useMemo(() => Math.random() * 10, []);
  useFrame((state) => {
    if (!ref.current || reducedMotion) return;
    const t = state.clock.elapsedTime + seed;
    ref.current.scale.y = 0.85 + Math.sin(t * 12) * 0.12 + Math.sin(t * 31) * 0.05;
    ref.current.scale.x = ref.current.scale.z = 0.9 + Math.sin(t * 9) * 0.07;
    ref.current.rotation.z = Math.sin(t * 5) * 0.08;
  });
  return (
    <group scale={size}>
      <mesh ref={ref} position={[0, 0.05, 0]}>
        <coneGeometry args={[0.028, 0.1, 8]} />
        <meshBasicMaterial color="#ffce6b" />
      </mesh>
      <mesh position={[0, 0.03, 0]}>
        <sphereGeometry args={[0.016, 6, 6]} />
        <meshBasicMaterial color="#fff2c8" />
      </mesh>
    </group>
  );
}

function Candle({ position, light = true, holder = true }: { position: [number, number, number]; light?: boolean; holder?: boolean }) {
  const lightRef = useRef<PointLight>(null);
  const reducedMotion = useGameStore((s) => s.reducedMotion);
  const isPlaying = useGameStore((s) => s.isPlaying);

  useFrame((state) => {
    if (!lightRef.current) return;
    const t = state.clock.elapsedTime;
    const flicker = reducedMotion ? 1 : 0.8 + Math.sin(t * 12 + position[0]) * 0.1 + Math.random() * 0.08;
    lightRef.current.intensity = flicker * (isPlaying ? 1.3 : 1) * 0.9;
  });

  return (
    <group position={position}>
      {holder && (
        <mesh position={[0, -0.1, 0]}>
          <cylinderGeometry args={[0.07, 0.085, 0.02, 12]} />
          <Metal color="#b8923a" roughness={0.4} metalness={0.8} />
        </mesh>
      )}
      <mesh>
        <cylinderGeometry args={[0.035, 0.045, 0.22, 10]} />
        <meshStandardMaterial color="#e8dcc0" roughness={0.6} />
      </mesh>
      {/* wax drips */}
      <mesh position={[0.03, 0.05, 0.02]} scale={[0.5, 1.4, 0.5]}>
        <sphereGeometry args={[0.02, 6, 6]} />
        <meshStandardMaterial color="#efe4c8" roughness={0.6} />
      </mesh>
      <group position={[0, 0.12, 0]}>
        <Flame />
      </group>
      {light && <pointLight ref={lightRef} position={[0, 0.22, 0]} color="#ffb347" intensity={0.9} distance={3.5} decay={2} />}
    </group>
  );
}

// A properly burning hearth fire: crossed logs, layered flame tongues that
// flicker and sway independently, and glowing sparks rising up the flue.
const HEARTH_FLAMES = [
  { pos: [0, 0.12, 0.35], r: 0.3, h: 1.0, color: "#ff8a1c", speed: 10, phase: 0 },
  { pos: [-0.18, 0.12, 0.4], r: 0.16, h: 0.66, color: "#ffb347", speed: 13, phase: 2.1 },
  { pos: [0.2, 0.12, 0.42], r: 0.13, h: 0.56, color: "#ffce6b", speed: 15, phase: 4.2 },
  { pos: [-0.05, 0.12, 0.44], r: 0.09, h: 0.42, color: "#ffe49a", speed: 18, phase: 1.3 },
  { pos: [0.09, 0.12, 0.38], r: 0.1, h: 0.5, color: "#ff6a10", speed: 12, phase: 3.4 },
] as const;

const HEARTH_SPARKS = Array.from({ length: 9 }, (_, i) => ({
  x: -0.2 + (i % 4) * 0.13,
  z: 0.34 + (i % 3) * 0.04,
  speed: 0.5 + (i % 3) * 0.22,
  phase: i * 0.71,
}));

function HearthFire() {
  const flames = useRef<(Mesh | null)[]>([]);
  const sparks = useRef<(Mesh | null)[]>([]);
  const reducedMotion = useGameStore((s) => s.reducedMotion);

  useFrame((state) => {
    if (reducedMotion) return;
    const t = state.clock.elapsedTime;
    flames.current.forEach((m, i) => {
      if (!m) return;
      const f = HEARTH_FLAMES[i];
      const flicker = 0.85 + Math.sin(t * f.speed + f.phase) * 0.18 + Math.sin(t * (f.speed * 0.37) + f.phase) * 0.1;
      m.scale.y = flicker;
      m.scale.x = m.scale.z = 0.9 + Math.sin(t * (f.speed * 0.7) + f.phase) * 0.12;
      m.position.y = f.pos[1] + (f.h / 2) * flicker;
      m.rotation.z = Math.sin(t * 2.2 + f.phase) * 0.1;
    });
    sparks.current.forEach((m, i) => {
      if (!m) return;
      const s = HEARTH_SPARKS[i];
      const cycle = (t * s.speed + s.phase) % 1;
      m.position.set(s.x + Math.sin((t + s.phase) * 3 + cycle * 6) * 0.06, 0.25 + cycle * 1.1, s.z);
      m.scale.setScalar(1 - cycle * 0.7);
      (m.material as MeshBasicMaterial).opacity = 1 - cycle;
    });
  });

  return (
    <group>
      {/* logs on a bed of embers */}
      <mesh position={[0, 0.14, 0.4]} rotation={[0, 0.5, 0.06]}>
        <cylinderGeometry args={[0.07, 0.08, 0.85, 8]} />
        <Wood base="#2e1a0c" dark="#0a0402" planks={1} />
      </mesh>
      <mesh position={[0, 0.16, 0.42]} rotation={[0, -0.6, -0.05]}>
        <cylinderGeometry args={[0.06, 0.07, 0.8, 8]} />
        <Wood base="#3a220e" dark="#0a0402" planks={1} />
      </mesh>
      <mesh position={[0.05, 0.26, 0.4]} rotation={[0, 0.1, 0.4]}>
        <cylinderGeometry args={[0.05, 0.06, 0.6, 8]} />
        <meshStandardMaterial color="#1a0c04" emissive="#c93d10" emissiveIntensity={0.5} roughness={1} />
      </mesh>
      {HEARTH_FLAMES.map((f, i) => (
        <mesh key={i} ref={(m) => (flames.current[i] = m)} position={[f.pos[0], f.pos[1] + f.h / 2, f.pos[2]]}>
          <coneGeometry args={[f.r, f.h, 8]} />
          <meshBasicMaterial color={f.color} />
        </mesh>
      ))}
      {HEARTH_SPARKS.map((s, i) => (
        <mesh key={i} ref={(m) => (sparks.current[i] = m)} position={[s.x, 0.25, s.z]}>
          <sphereGeometry args={[0.022, 6, 6]} />
          <meshBasicMaterial color="#ffb347" transparent />
        </mesh>
      ))}
    </group>
  );
}

// Drifting smoke haze — soft radial-gradient sprites floating in the rafters
function Smoke() {
  const groupRef = useRef<Group>(null);
  const reducedMotion = useGameStore((s) => s.reducedMotion);
  const mobile = useIsMobile();
  const count = mobile ? 4 : 8;

  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    const g = ctx.createRadialGradient(64, 64, 8, 64, 64, 64);
    g.addColorStop(0, "rgba(222,206,178,0.5)");
    g.addColorStop(0.5, "rgba(200,184,158,0.2)");
    g.addColorStop(1, "rgba(200,184,158,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    return new CanvasTexture(c);
  }, []);

  const puffs = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        base: [-5.5 + (i * 12.8) / count, 2.6 + (i % 3) * 0.8, -2.8 + (i % 2) * 2.6] as const,
        scale: 2.8 + (i % 3) * 1.3,
        speed: 0.06 + (i % 3) * 0.03,
        phase: i * 1.7,
      })),
    [count]
  );

  useFrame((state) => {
    if (!groupRef.current || reducedMotion) return;
    const t = state.clock.elapsedTime;
    groupRef.current.children.forEach((s, i) => {
      const p = puffs[i];
      s.position.x = p.base[0] + Math.sin(t * p.speed * 2 + p.phase) * 0.9;
      s.position.y = p.base[1] + Math.sin(t * p.speed + p.phase) * 0.35;
      const m = (s as Sprite).material as SpriteMaterial;
      m.opacity = 0.11 + Math.sin(t * 0.25 + p.phase) * 0.04;
    });
  });

  if (!tex) return null;
  return (
    <group ref={groupRef}>
      {puffs.map((p, i) => (
        <sprite key={i} position={[p.base[0], p.base[1], p.base[2]]} scale={[p.scale, p.scale * 0.65, 1]}>
          <spriteMaterial map={tex} transparent opacity={0.12} depthWrite={false} />
        </sprite>
      ))}
    </group>
  );
}

function Barrel({ position, rotation = [0, 0, 0] as [number, number, number], scale = 1 }: { position: [number, number, number]; rotation?: [number, number, number]; scale?: number }) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.42, 0.38, 1.0, 18]} />
        <Wood base="#5a3a1d" dark="#1a0e04" planks={10} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.455, 0.455, 0.3, 18]} />
        <Wood base="#5a3a1d" dark="#1a0e04" planks={10} />
      </mesh>
      {[-0.38, -0.12, 0.12, 0.38].map((y, i) => (
        <mesh key={i} position={[0, y, 0]}>
          <torusGeometry args={[Math.abs(y) > 0.2 ? 0.425 : 0.46, 0.022, 8, 28]} />
          <Metal color="#3a3a3a" roughness={0.6} metalness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

function Crate({ position, rotation = 0, size = 0.6 }: { position: [number, number, number]; rotation?: number; size?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, size / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[size, size, size]} />
        <Wood base="#8a6a3e" dark="#2a1a08" planks={3} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, size / 2, (s * size) / 2 + s * 0.005]}>
          <boxGeometry args={[size * 1.02, 0.06, 0.01]} />
          <Wood base="#6a4a2e" dark="#2a1a08" planks={1} />
        </mesh>
      ))}
    </group>
  );
}

function Chandelier({ position }: { position: [number, number, number] }) {
  const light = useRef<PointLight>(null);
  const reducedMotion = useGameStore((s) => s.reducedMotion);
  useFrame((state) => {
    if (!light.current || reducedMotion) return;
    const t = state.clock.elapsedTime;
    light.current.intensity = 2.4 + Math.sin(t * 9) * 0.15 + Math.random() * 0.1;
  });
  const candles = useMemo(() => Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2), []);
  return (
    <group position={position}>
      {/* chains up to the beam */}
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.45, 0.7, Math.sin(a) * 0.45]} rotation={[Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5]}>
            <cylinderGeometry args={[0.01, 0.01, 1.55, 6]} />
            <Metal color="#2a2a2a" roughness={0.7} />
          </mesh>
        );
      })}
      {/* iron wheel */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.9, 0.035, 8, 36]} />
        <Metal color="#2a2a2a" roughness={0.7} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.06, 0]}>
        <torusGeometry args={[0.9, 0.02, 6, 36]} />
        <Metal color="#2a2a2a" roughness={0.7} />
      </mesh>
      {[0, Math.PI / 2].map((a) => (
        <mesh key={a} rotation={[0, a, 0]}>
          <boxGeometry args={[1.8, 0.03, 0.03]} />
          <Metal color="#2a2a2a" roughness={0.7} />
        </mesh>
      ))}
      {candles.map((a, i) => (
        <group key={i} position={[Math.cos(a) * 0.9, 0.05, Math.sin(a) * 0.9]}>
          <mesh position={[0, -0.02, 0]}>
            <cylinderGeometry args={[0.05, 0.04, 0.03, 10]} />
            <Metal color="#2a2a2a" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.08, 0]}>
            <cylinderGeometry args={[0.028, 0.032, 0.18, 8]} />
            <meshStandardMaterial color="#e8dcc0" roughness={0.6} />
          </mesh>
          <group position={[0, 0.17, 0]}>
            <Flame size={0.9} />
          </group>
        </group>
      ))}
      <pointLight ref={light} position={[0, 0.3, 0]} color="#ffb860" intensity={2.4} distance={9} decay={2} />
    </group>
  );
}

function Sconce({ position, rotation }: { position: [number, number, number]; rotation: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* iron bracket out of the wall */}
      <mesh position={[0, 0, 0.1]}>
        <boxGeometry args={[0.04, 0.04, 0.22]} />
        <Metal color="#2a2a2a" roughness={0.7} />
      </mesh>
      <mesh position={[0, -0.12, 0.04]} rotation={[0.6, 0, 0]}>
        <boxGeometry args={[0.03, 0.3, 0.03]} />
        <Metal color="#2a2a2a" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.03, 0.2]}>
        <cylinderGeometry args={[0.06, 0.045, 0.05, 10]} />
        <Metal color="#2a2a2a" roughness={0.7} />
      </mesh>
      <Candle position={[0, 0.16, 0.2]} holder={false} light={false} />
      {/* soot stain above */}
      <mesh position={[0, 0.55, 0.005]}>
        <planeGeometry args={[0.35, 0.7]} />
        <meshStandardMaterial color="#000000" transparent opacity={0.35} roughness={1} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Window({ position, rotation, light = false }: { position: [number, number, number]; rotation: number; light?: boolean }) {
  const glass = windowTexture();
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* recessed stone surround */}
      <mesh position={[0, 0, -0.06]}>
        <boxGeometry args={[1.35, 1.75, 0.12]} />
        <meshStandardMaterial map={stoneTexture({ base: "#9a8a6c", rows: 5, repeat: [1, 1] })} roughness={1} />
      </mesh>
      {/* leaded glass */}
      <mesh position={[0, 0, 0.005]}>
        <planeGeometry args={[1.1, 1.5]} />
        <meshStandardMaterial map={glass} emissive="#6f88a6" emissiveMap={glass} emissiveIntensity={0.9} roughness={0.3} />
      </mesh>
      {/* mullion + transom */}
      <mesh position={[0, 0, 0.03]}>
        <boxGeometry args={[0.07, 1.55, 0.06]} />
        <Wood base="#3a2512" dark="#120a04" planks={1} />
      </mesh>
      <mesh position={[0, 0.2, 0.03]}>
        <boxGeometry args={[1.15, 0.07, 0.06]} />
        <Wood base="#3a2512" dark="#120a04" planks={1} />
      </mesh>
      {/* frame */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.6, 0, 0.03]}>
          <boxGeometry args={[0.1, 1.6, 0.08]} />
          <Wood base="#3a2512" dark="#120a04" planks={1} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, s * 0.8, 0.03]}>
          <boxGeometry args={[1.3, 0.1, 0.08]} />
          <Wood base="#3a2512" dark="#120a04" planks={1} />
        </mesh>
      ))}
      {/* sill */}
      <mesh position={[0, -0.88, 0.1]}>
        <boxGeometry args={[1.4, 0.07, 0.3]} />
        <meshStandardMaterial map={stoneTexture({ base: "#9a8a6c", rows: 5 })} roughness={1} />
      </mesh>
      {light && <pointLight position={[0, 0, 0.6]} color="#8ea8c8" intensity={0.7} distance={5} decay={2} />}
    </group>
  );
}

function Banner({ position, field, emblem }: { position: [number, number, number]; field: string; emblem: "cross" | "star" | "chevron" | "lion" }) {
  const tex = bannerTexture({ field, emblem });
  return (
    <group position={position}>
      <mesh position={[0, 1.25, 0.06]}>
        <cylinderGeometry args={[0.025, 0.025, 1.3, 8]} />
        <Wood base="#3a2512" dark="#120a04" planks={1} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.65, 1.25, 0.06]}>
          <sphereGeometry args={[0.045, 8, 8]} />
          <Metal color="#b8923a" roughness={0.4} metalness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, 0, 0.05]}>
        <planeGeometry args={[1.05, 2.4, 1, 6]} />
        <meshStandardMaterial map={tex} roughness={0.95} side={2} />
      </mesh>
    </group>
  );
}

function HerbBundle({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.004, 0.004, 0.3, 4]} />
        <meshStandardMaterial color="#c9b58a" />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.035, -0.12, Math.sin(a) * 0.035]} rotation={[Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3]}>
            <capsuleGeometry args={[0.025, 0.2, 3, 6]} />
            <meshStandardMaterial color={["#5a6b3a", "#6b7a44", "#4e5e34", "#7a8a4a", "#5a6b3a"][i]} roughness={1} />
          </mesh>
        );
      })}
      <mesh position={[0, 0, 0]}>
        <torusGeometry args={[0.045, 0.008, 6, 10]} />
        <meshStandardMaterial color="#c9b58a" />
      </mesh>
    </group>
  );
}

function Antlers({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.22, 0.05, 6]} />
        <Wood base="#3a2512" dark="#120a04" planks={1} />
      </mesh>
      <mesh position={[0, 0, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.07, 0.09, 0.08, 10]} />
        <meshStandardMaterial color="#e3d5b8" roughness={0.8} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.06, 0.03, 0.08]} rotation={[0, 0, s * -0.7]}>
          <mesh position={[0, 0.22, 0]}>
            <cylinderGeometry args={[0.018, 0.028, 0.45, 6]} />
            <meshStandardMaterial color="#e3d5b8" roughness={0.8} />
          </mesh>
          {[0.15, 0.3, 0.4].map((y, i) => (
            <mesh key={i} position={[s * 0.07, y, 0]} rotation={[0, 0, s * -0.9]}>
              <cylinderGeometry args={[0.008, 0.018, 0.18 - i * 0.03, 5]} />
              <meshStandardMaterial color="#e3d5b8" roughness={0.8} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function Loaf({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh scale={[1.6, 0.8, 1]}>
        <sphereGeometry args={[0.075, 12, 10]} />
        <meshStandardMaterial color="#b98a52" roughness={0.95} />
      </mesh>
      {[-0.03, 0.03].map((x) => (
        <mesh key={x} position={[x, 0.05, 0]} rotation={[0, 0, 0.5]}>
          <boxGeometry args={[0.012, 0.03, 0.09]} />
          <meshStandardMaterial color="#e9d6ae" roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

function Beam({ position, rotation = [0, 0, 0] as [number, number, number], size }: { position: [number, number, number]; rotation?: [number, number, number]; size: [number, number, number] }) {
  return (
    <mesh position={position} rotation={rotation} castShadow>
      <boxGeometry args={size} />
      <Wood base="#4a2f16" dark="#160c04" planks={1} />
    </mesh>
  );
}

// Half-timbered wall: stone skirting, plaster above, dark oak posts, rails
// and braces. `length` runs along local x; wall faces local +z.
function TimberWall({ length, height = 6 }: { length: number; height?: number }) {
  const plaster = plasterTexture({ base: "#b8a27c", repeat: [length / 2.5, height / 2.5] });
  const stone = stoneTexture({ base: "#7e6a4e", rows: 4, repeat: [length / 1.6, 1] });
  const posts = useMemo(() => {
    const n = Math.round(length / 2.3);
    return Array.from({ length: n + 1 }, (_, i) => -length / 2 + (i * length) / n);
  }, [length]);
  return (
    <group>
      <mesh position={[0, height / 2, -0.2]} receiveShadow>
        <boxGeometry args={[length, height, 0.4]} />
        <meshStandardMaterial map={plaster} roughness={1} />
      </mesh>
      {/* stone skirting */}
      <mesh position={[0, 0.55, -0.1]} receiveShadow>
        <boxGeometry args={[length, 1.1, 0.26]} />
        <meshStandardMaterial map={stone} bumpMap={stone} bumpScale={1.2} roughness={1} />
      </mesh>
      <Beam position={[0, 1.15, -0.04]} size={[length, 0.12, 0.16]} />
      {/* posts */}
      {posts.map((x) => (
        <Beam key={x} position={[x, height / 2 + 0.55, -0.03]} size={[0.22, height - 1.1, 0.14]} />
      ))}
      {/* rails */}
      <Beam position={[0, 2.95, -0.03]} size={[length, 0.2, 0.14]} />
      <Beam position={[0, 4.55, -0.03]} size={[length, 0.2, 0.14]} />
      {/* braces in the upper panels */}
      {posts.slice(0, -1).map((x, i) => (
        <Beam
          key={i}
          position={[x + length / posts.length / 2 / 1, 3.75, -0.03]}
          rotation={[0, 0, i % 2 ? 0.55 : -0.55]}
          size={[0.14, 1.5, 0.12]}
        />
      ))}
    </group>
  );
}

export default function TavernEnvironment() {
  const fireLight = useRef<PointLight>(null);
  const reducedMotion = useGameStore((s) => s.reducedMotion);

  useFrame((state) => {
    if (fireLight.current && !reducedMotion) {
      const t = state.clock.elapsedTime;
      fireLight.current.intensity = 3.2 + Math.sin(t * 8) * 0.5 + Math.random() * 0.35;
    }
  });

  const floor = woodTexture({ base: "#6a4524", dark: "#1e1006", planks: 5, repeat: [5, 5] });
  const ceiling = woodTexture({ base: "#3a2712", dark: "#120a04", planks: 6, horizontal: true, repeat: [1, 6] });
  const hearthStone = stoneTexture({ base: "#8a7354", mortar: "#3f3222", rows: 6, repeat: [2, 2] });
  const chimneyStone = stoneTexture({ base: "#846d4e", mortar: "#3f3222", rows: 6, repeat: [1.5, 2] });
  const rug = rugTexture();

  return (
    <group>
      {/* FLOOR — oak planks running toward the camera */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[18, 18]} />
        <meshStandardMaterial map={floor} bumpMap={floor} bumpScale={0.8} roughness={0.8} />
      </mesh>

      {/* RUG — woven carpet under the band */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0.3]} receiveShadow>
        <circleGeometry args={[3.2, 48]} />
        <meshStandardMaterial map={rug} roughness={0.95} />
      </mesh>

      {/* WALLS — half-timbered plaster over stone */}
      <group position={[0, 0, -3.8]}>
        <TimberWall length={18} />
      </group>
      <group position={[-6.8, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <TimberWall length={12} />
      </group>
      <group position={[6.8, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <TimberWall length={12} />
      </group>

      {/* CEILING + exposed beams and rafters */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 5.15, 0]}>
        <planeGeometry args={[18, 14]} />
        <meshStandardMaterial map={ceiling} roughness={1} />
      </mesh>
      {[-3.2, -1.4, 0.4, 2.2].map((z, i) => (
        <Beam key={i} position={[0, 4.7, z]} size={[14.2, 0.32, 0.36]} />
      ))}
      {Array.from({ length: 9 }).map((_, i) => (
        <Beam key={i} position={[-6 + i * 1.5, 4.98, -0.5]} size={[0.18, 0.2, 9]} />
      ))}
      {/* corbels where beams meet the walls */}
      {[-3.2, -1.4, 0.4, 2.2].map((z) =>
        [-6.6, 6.6].map((x) => (
          <Beam key={`${x}${z}`} position={[x, 4.38, z]} size={[0.5, 0.32, 0.3]} />
        ))
      )}
      {/* herbs and garlic drying from the rafters */}
      {[
        [3.6, 4.5, -2.6],
        [4.1, 4.45, -2.2],
        [-4.6, 4.5, -3.0],
        [-5.1, 4.45, -2.6],
      ].map(([x, y, z], i) => (
        <HerbBundle key={i} position={[x, y, z]} />
      ))}

      {/* CHANDELIER over the band's table */}
      <Chandelier position={[0, 3.25, 0.9]} />

      {/* WALL SCONCES */}
      <Sconce position={[-6.6, 2.4, -1.6]} rotation={Math.PI / 2} />
      <Sconce position={[-6.6, 2.4, 3.2]} rotation={Math.PI / 2} />
      <Sconce position={[6.6, 2.4, 3.4]} rotation={-Math.PI / 2} />
      <Sconce position={[1.0, 2.2, -3.6]} rotation={0} />
      <Sconce position={[-1.0, 2.2, -3.6]} rotation={0} />

      {/* one soft light per wall stands in for the five sconce candles */}
      <pointLight position={[-5.8, 2.6, 0.8]} color="#ffb347" intensity={0.9} distance={6} decay={2} />
      <pointLight position={[0, 2.6, -3.0]} color="#ffb347" intensity={0.9} distance={6} decay={2} />

      {/* WINDOWS — leaded glass, night outside */}
      <Window position={[-6.62, 2.75, -2.4]} rotation={Math.PI / 2} />
      <Window position={[-6.62, 2.75, 3.3]} rotation={Math.PI / 2} />
      <Window position={[6.62, 3.05, 3.6]} rotation={-Math.PI / 2} />

      {/* FIREPLACE (right back corner) — coursed stone hearth with an arched
          opening, oak mantel, tapered chimney breast up to the rafters */}
      <group position={[4.5, 0, -3.35]}>
        <mesh position={[0, 1.0, 0]} castShadow>
          <boxGeometry args={[2.5, 2.0, 0.85]} />
          <meshStandardMaterial map={hearthStone} bumpMap={hearthStone} bumpScale={1.5} roughness={1} />
        </mesh>
        {/* stone arch voussoirs around the opening */}
        <mesh position={[0, 1.2, 0.43]} rotation={[0, 0, 0]}>
          <torusGeometry args={[0.72, 0.09, 6, 16, Math.PI]} />
          <meshStandardMaterial color="#6e5a40" roughness={1} />
        </mesh>
        {/* mantel shelf */}
        <mesh position={[0, 2.06, 0.1]} castShadow>
          <boxGeometry args={[2.7, 0.14, 0.95]} />
          <Wood base="#5a3b20" dark="#1a0e04" planks={2} />
        </mesh>
        {/* corbels under the mantel */}
        {[-1.15, 1.15].map((x) => (
          <mesh key={x} position={[x, 1.9, 0.45]}>
            <boxGeometry args={[0.2, 0.18, 0.2]} />
            <meshStandardMaterial color="#6e5a40" roughness={1} />
          </mesh>
        ))}
        {/* mantel clutter */}
        {[-1.0, -0.6, 0.35, 0.8, 1.1].map((x, i) => (
          <Bottle key={i} position={[x, 2.13, 0.25]} color={["#7a4a1a", "#3f5a2e", "#5a2e2e", "#7a4a1a", "#44507a"][i]} height={0.18 + (i % 2) * 0.05} />
        ))}
        <Jug position={[-0.15, 2.13, 0.2]} color="#8a6a4a" scale={0.7} />
        <Candle position={[0.05, 2.25, 0.35]} light={false} />
        {/* antlers over the mantel */}
        <Antlers position={[0, 2.85, 0.02]} />
        {/* tapered chimney breast rising to the beams */}
        <mesh position={[0, 3.4, -0.1]} rotation={[0, Math.PI / 4, 0]} scale={[1, 1, 0.55]} castShadow>
          <cylinderGeometry args={[0.75, 1.5, 2.6, 4]} />
          <meshStandardMaterial map={chimneyStone} bumpMap={chimneyStone} bumpScale={1.2} roughness={1} />
        </mesh>
        {/* firebox */}
        <mesh position={[0, 0.6, 0.43]}>
          <planeGeometry args={[1.3, 1.2]} />
          <meshStandardMaterial color="#0a0603" />
        </mesh>
        <mesh position={[0, 1.2, 0.43]}>
          <circleGeometry args={[0.65, 20, 0, Math.PI]} />
          <meshStandardMaterial color="#0a0603" />
        </mesh>
        {/* iron crane with a kettle over the fire */}
        <mesh position={[-0.55, 1.0, 0.45]}>
          <cylinderGeometry args={[0.02, 0.02, 1.0, 6]} />
          <Metal color="#2a2a2a" roughness={0.7} />
        </mesh>
        <mesh position={[-0.25, 1.45, 0.45]}>
          <boxGeometry args={[0.6, 0.03, 0.03]} />
          <Metal color="#2a2a2a" roughness={0.7} />
        </mesh>
        <mesh position={[0, 1.28, 0.45]}>
          <cylinderGeometry args={[0.006, 0.006, 0.3, 4]} />
          <Metal color="#2a2a2a" roughness={0.7} />
        </mesh>
        <mesh position={[0, 1.05, 0.45]} scale={[1, 0.8, 1]}>
          <sphereGeometry args={[0.16, 12, 10]} />
          <Metal color="#1e1e1e" roughness={0.8} metalness={0.6} />
        </mesh>
        <mesh position={[0, 1.18, 0.45]} rotation={[0, 0, 0]}>
          <torusGeometry args={[0.1, 0.012, 6, 12, Math.PI]} />
          <Metal color="#1e1e1e" roughness={0.8} />
        </mesh>
        <HearthFire />
        <mesh position={[0, 0.12, 0.45]}>
          <sphereGeometry args={[0.3, 10, 8]} />
          <meshBasicMaterial color="#c93d10" />
        </mesh>
        <pointLight ref={fireLight} position={[0, 0.8, 0.9]} color="#ff8a2c" intensity={3.2} distance={11} decay={2} />
        {/* fire irons leaning on the hearth */}
        {[0, 1].map((i) => (
          <mesh key={i} position={[1.35 + i * 0.1, 0.5, 0.35]} rotation={[0.1, 0, 0.12 + i * 0.08]}>
            <cylinderGeometry args={[0.012, 0.012, 1.0, 6]} />
            <Metal color="#2a2a2a" roughness={0.7} />
          </mesh>
        ))}
        {/* log pile beside the hearth */}
        <group position={[-1.6, 0, 0.3]}>
          {[
            [0, 0.08, 0],
            [0.17, 0.08, 0.05],
            [-0.17, 0.08, -0.03],
            [0.08, 0.23, 0.02],
            [-0.09, 0.23, 0.0],
            [0, 0.38, 0.01],
          ].map(([x, y, z], i) => (
            <mesh key={i} position={[x, y, z]} rotation={[Math.PI / 2, 0, (i % 2) * 0.1]}>
              <cylinderGeometry args={[0.075, 0.08, 0.6, 8]} />
              <Wood base={i % 2 ? "#6a4a2a" : "#5a3a1e"} dark="#1a0e04" planks={1} />
            </mesh>
          ))}
        </group>
      </group>

      {/* Smoke haze drifting through the rafters */}
      <Smoke />

      {/* CENTRAL TABLE — heavy oak top on a trestle, laid for supper */}
      <group position={[0, 0, 1.7]}>
        <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.95, 0.95, 0.08, 24]} />
          <Wood base="#6a4626" dark="#1e1006" planks={6} repeat={[2, 2]} roughness={0.55} />
        </mesh>
        <mesh position={[0, 0.37, 0]}>
          <torusGeometry args={[0.95, 0.03, 6, 32]} />
          <Wood base="#4a3018" dark="#1a0e04" planks={1} />
        </mesh>
        {[-1, 1].map((s) => (
          <group key={s}>
            <mesh position={[s * 0.5, 0.19, 0]} rotation={[0, 0, s * 0.2]}>
              <boxGeometry args={[0.1, 0.38, 0.5]} />
              <Wood base="#4a3018" dark="#1a0e04" planks={1} />
            </mesh>
            <mesh position={[s * 0.55, 0.03, 0]}>
              <boxGeometry args={[0.16, 0.06, 0.6]} />
              <Wood base="#4a3018" dark="#1a0e04" planks={1} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 0.16, 0]}>
          <boxGeometry args={[1.0, 0.07, 0.07]} />
          <Wood base="#4a3018" dark="#1a0e04" planks={1} />
        </mesh>
        {/* supper */}
        <mesh position={[-0.45, 0.47, -0.3]}>
          <cylinderGeometry args={[0.17, 0.15, 0.02, 16]} />
          <meshStandardMaterial color="#cfc3a6" roughness={0.6} />
        </mesh>
        <Loaf position={[-0.45, 0.52, -0.3]} rotation={0.4} />
        <mesh position={[0.5, 0.47, -0.4]}>
          <cylinderGeometry args={[0.16, 0.12, 0.09, 14, 1, true]} />
          <meshStandardMaterial color="#7a5a3a" roughness={0.7} side={2} />
        </mesh>
        {[
          [0.5, 0.52, -0.4, "#b8402a"],
          [0.44, 0.54, -0.33, "#d9892a"],
          [0.57, 0.53, -0.35, "#7a2a3a"],
          [0.5, 0.58, -0.38, "#b8402a"],
        ].map(([x, y, z, c], i) => (
          <mesh key={i} position={[x as number, y as number, z as number]}>
            <sphereGeometry args={[0.05, 10, 8]} />
            <meshStandardMaterial color={c as string} roughness={0.5} />
          </mesh>
        ))}
        <Bottle position={[0.7, 0.46, 0.15]} color="#3f5a2e" />
        <Jug position={[-0.65, 0.46, 0.25]} color="#8a6a4a" scale={0.8} />
        {/* knife and a scatter of crumbs */}
        <mesh position={[-0.2, 0.465, -0.6]} rotation={[0, 0.6, 0]}>
          <boxGeometry args={[0.2, 0.008, 0.025]} />
          <Metal color="#c9ccd2" roughness={0.3} />
        </mesh>
        <mesh position={[-0.1, 0.47, 0.6]} rotation={[-Math.PI / 2, 0, 0.3]}>
          <planeGeometry args={[0.5, 0.35]} />
          <meshStandardMaterial color="#e9dfc4" roughness={1} />
        </mesh>
      </group>

      {/* BARRELS, CRATES */}
      <Barrel position={[-5.7, 0.5, -0.4]} />
      <Barrel position={[-4.2, 0.5, -2.6]} />
      <Barrel position={[-5.1, 0.5, -2.9]} scale={0.9} />
      <Barrel position={[-4.65, 1.45, -2.75]} rotation={[0, 0.4, 0]} scale={0.85} />
      <Crate position={[-5.9, 0, -1.5]} rotation={0.3} />
      <Crate position={[-5.9, 0.6, -1.5]} rotation={-0.2} size={0.5} />

      {/* CANDLES on the band's table and about the room */}
      <Candle position={[-0.5, 0.57, 1.7]} />
      <Candle position={[0.5, 0.57, 1.9]} light={false} />
      {/* on the stacked barrel and the left window sill */}
      <Candle position={[-4.65, 1.99, -2.75]} light={false} />
      <Candle position={[-6.45, 2.0, -2.4]} light={false} />

      {/* GALLERY WALL — framed old masters from /public/artwork */}
      <WallPainting
        url="/artwork/angelicWall.jpg"
        position={[0, 2.6, -3.55]}
        width={2.3}
        height={3.0}
        crop={{ repeat: [0.87, 0.7], offset: [0.065, 0.13] }}
        framed={false}
      />
      <WallPainting url="/artwork/lute-player.jpg" position={[-5.3, 2.7, -3.68]} width={1.15} height={1.5} />
      <WallPainting
        url="/artwork/piper.jpg"
        position={[-3.0, 2.8, -3.68]}
        width={0.95}
        height={1.22}
        crop={{ repeat: [0.735, 0.71], offset: [0.04, 0.255] }}
        framed={false}
      />
      <WallPainting url="/artwork/vermeer.jpg" position={[-6.68, 2.6, 0.9]} rotation={[0, Math.PI / 2, 0]} width={1.5} height={1.95} />
      <WallPainting url="/artwork/concert.jpg" position={[6.68, 3.1, 0.9]} rotation={[0, -Math.PI / 2, 0]} width={1.5} height={1.95} />

      {/* HANGING BANNERS on back wall */}
      <Banner position={[-1.8, 3.6, -3.72]} field="#6b1f2a" emblem="lion" />
      <Banner position={[1.8, 3.6, -3.72]} field="#2f4a3c" emblem="cross" />

      {/* Mugs on the table */}
      <mesh position={[0.3, 0.54, 1.5]}>
        <cylinderGeometry args={[0.065, 0.075, 0.16, 12]} />
        <Metal color="#caa84d" roughness={0.45} metalness={0.6} />
      </mesh>
      <mesh position={[-0.35, 0.54, 1.9]}>
        <cylinderGeometry args={[0.065, 0.075, 0.16, 12]} />
        <Metal color="#9a8540" roughness={0.45} metalness={0.6} />
      </mesh>
    </group>
  );
}

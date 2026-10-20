import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { Group, Object3D } from "three";
import { useGameStore } from "../lib/useGameStore";
import { glowAnchors } from "../lib/glow";
import Figure, { type FigureLook } from "./characters/Figure";
import { Wood } from "./characters/materials";

// BARMAID
// The tavern waitress doing endless laps of the room with a tankard held
// high: chestnut hair in a bun with a white ribbon, off-the-shoulder
// chemise with puffed sleeves, laced leather corset, white apron over a
// dark skirt, boots. She is also the walking trigger for "Angelic Frick" —
// click her to play it.

const SONG_ID = "angelic-frick";

// Her round: an ellipse that circles the band and the table, passing behind
// the back row, outside the horse on the left and inside the bar stools on
// the right. The spare instruments, the
// keg and the barrels are placed to stay clear of it.
const ROUND = { cx: -0.5, cz: 0.25, rx: 4.5, rz: 3.2, speed: 0.22 };

// Follows the painted reference board in /public/band/members/Barmaid Character Reference.png:
// chestnut hair piled under a frilled white cap, off-the-shoulder chemise
// with puffed sleeves, laced leather corset, white apron over a torn dark
// skirt, hip pouch, heeled boots. The head is cropped from that board.
const LOOK: FigureLook = {
  build: "slim",
  skin: "#efc6a4",
  face: { url: "/band/Heads/barmaid-head.png", back: "#5a3418", height: 0.4, keyTolerance: 26 },
  outfit: {
    kind: "dress",
    color: "#2b2a24",
    accent: "#8a5a2e",
    sleeves: "puffed",
    sleeveColor: "#f3ede0",
    collar: "none",
    corset: "#6e4423",
    apron: "#efe6d2",
    pouch: "#4a2e16",
    belt: false,
  },
  legs: { skirt: "#4a4038", boots: "#4a301c" },
  hair: { style: "bun", color: "#5a3418" },
  expression: "laugh",
  nose: "small",
  eyeColor: "#4a2e17",
  blush: 0.45,
};

function Tankard() {
  return (
    <group rotation={[0.2, 0, 0]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.07, 0.085, 0.2, 12]} />
        <Wood base="#8a6a3e" dark="#2a1a08" planks={6} />
      </mesh>
      {[-0.07, 0.07].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.02, 12]} />
          <meshStandardMaterial color="#8c8f96" metalness={0.7} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, 0.11, 0]} scale={[1, 0.5, 1]}>
        <sphereGeometry args={[0.075, 10, 8]} />
        <meshStandardMaterial color="#f0ead8" roughness={0.9} />
      </mesh>
      <mesh position={[0.09, 0, 0]}>
        <torusGeometry args={[0.05, 0.014, 6, 12, Math.PI]} />
        <meshStandardMaterial color="#5a3a1c" roughness={0.6} />
      </mesh>
    </group>
  );
}

export default function Barmaid() {
  const walker = useRef<Group>(null);
  const body = useRef<Group>(null);
  const rightArm = useRef<Group>(null);
  const head = useRef<Group>(null);
  const glowAnchor = useRef<Object3D>(null);
  const [hovered, setHovered] = useState(false);
  const reducedMotion = useGameStore((s) => s.reducedMotion);
  const selectSong = useGameStore((s) => s.selectSong);
  const currentSongId = useGameStore((s) => s.currentSongId);

  const isActive = currentSongId === SONG_ID;
  const glow = hovered || isActive;
  const glowColor = isActive ? "#ffd97a" : "#e7c66a";

  // While her song plays she carries the shared "active" glow light.
  useEffect(() => {
    const me = glowAnchor.current;
    if (isActive) glowAnchors.active = me;
    return () => {
      if (glowAnchors.active === me) glowAnchors.active = null;
    };
  }, [isActive]);

  useFrame((state) => {
    if (!walker.current) return;
    const raw = state.clock.elapsedTime;
    // elliptical stroll around the band circle
    const t = (reducedMotion ? 0 : raw) * ROUND.speed + 1.2;
    const x = ROUND.cx + Math.sin(t) * ROUND.rx;
    const z = ROUND.cz + Math.cos(t) * ROUND.rz;
    walker.current.position.set(x, 0, z);
    // face the direction of travel
    walker.current.rotation.y = Math.atan2(Math.cos(t) * ROUND.rx, -Math.sin(t) * ROUND.rz);
    if (body.current && !reducedMotion) {
      // brisk walk bob + hip sway
      body.current.position.y = Math.abs(Math.sin(raw * 6)) * 0.045;
      body.current.rotation.z = Math.sin(raw * 6) * 0.045;
    }
    if (rightArm.current && !reducedMotion) {
      // tankard held aloft, swaying with the stride
      rightArm.current.rotation.z = -2.3 + Math.sin(raw * 3) * 0.1;
      rightArm.current.rotation.x = -0.3 + Math.sin(raw * 6) * 0.05;
    }
    if (head.current && !reducedMotion) {
      head.current.rotation.z = Math.sin(raw * 1.5) * 0.08;
      head.current.rotation.y = Math.sin(raw * 0.9) * 0.2;
    }
    // hover bounce, same feel as the other clickable props
    if (body.current) {
      const target = hovered ? 1.08 : 1;
      const next = body.current.scale.x + (target - body.current.scale.x) * 0.15;
      body.current.scale.setScalar(next);
    }
  });

  return (
    <group
      ref={walker}
      onClick={(e) => {
        e.stopPropagation();
        selectSong(SONG_ID);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        glowAnchors.hover = glowAnchor.current;
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        if (glowAnchors.hover === glowAnchor.current) glowAnchors.hover = null;
        document.body.style.cursor = "auto";
      }}
    >
      <group ref={body}>
        {/* where the shared glow light sits when she's hovered or playing */}
        <object3D ref={glowAnchor} position={[0, 1.3, 0.3]} />
        <Figure
          look={LOOK}
          pose="standing"
          highlight={glow}
          highlightColor={glowColor}
          refs={{ rightArm, head }}
          armPose={{ left: [0.15, 0, 0.95], leftElbow: -0.9, right: [-0.3, 0, -2.3], rightElbow: -0.6 }}
          heldRight={<Tankard />}
        />
      </group>

      {hovered && (
        <Html position={[0, 2.1, 0]} center distanceFactor={9}>
          <div className="pointer-events-none whitespace-nowrap border-2 border-tavern-gold bg-tavern-shadow/95 px-2.5 py-1 text-[11px] text-tavern-linen font-mono uppercase tracking-wider shadow-brutal-cobalt">
            Play Angelic Frick
          </div>
        </Html>
      )}
    </group>
  );
}

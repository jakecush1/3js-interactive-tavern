import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { Group } from "three";
import type { BandMember as BandMemberData } from "../data/bandMembers";
import { useGameStore } from "../lib/useGameStore";
import { getSong } from "../data/songs";
import Instrument from "./Instrument";
import Figure, { figureMetrics } from "./characters/Figure";

// BAND MEMBER
// A seated Renaissance musician built from the Figure kit, wearing the
// member's real face (transparent cutout from /public/band/Heads) on a
// sculpted head. Idle = gentle breathing/sway. Playing = rhythmic arm +
// body motion scaled by song mood & bpm. Clothing, build and face are all
// configured per member in src/data/bandMembers.ts.

type Props = {
  member: BandMemberData;
  index: number;
};

const MOOD_ENERGY: Record<string, number> = {
  warm: 0.7,
  rowdy: 1.0,
  mysterious: 0.4,
  melancholy: 0.3,
};

export default function BandMember({ member, index }: Props) {
  const group = useRef<Group>(null);
  const leftArm = useRef<Group>(null);
  const rightArm = useRef<Group>(null);
  const head = useRef<Group>(null);

  const [hovered, setHovered] = useState(false);

  const isPlaying = useGameStore((s) => s.isPlaying);
  const currentSongId = useGameStore((s) => s.currentSongId);
  const focusedMemberId = useGameStore((s) => s.focusedMemberId);
  const reducedMotion = useGameStore((s) => s.reducedMotion);
  const focusMember = useGameStore((s) => s.focusMember);

  const song = getSong(currentSongId);
  const energy = song ? MOOD_ENERGY[song.mood] ?? 0.6 : 0;
  const bpmRate = song ? song.bpm / 60 : 1;
  const offset = index * 1.3; // desync members
  const isFocused = focusedMemberId === member.id;

  const build = member.look.build ?? "stout";
  const metrics = figureMetrics(build, "seated");
  const lanky = build === "lanky";
  const instrY = lanky ? 0.82 : 0.56;
  const instrZ = lanky ? 0.3 : 0.22;
  const tipY = metrics.top + 0.15;

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    const motion = reducedMotion ? 0.3 : 1;

    if (isPlaying && song) {
      // body sway with the beat
      const beat = t * bpmRate * Math.PI;
      group.current.position.y =
        member.position[1] + Math.abs(Math.sin(beat + offset)) * 0.06 * energy * motion;
      group.current.rotation.z = Math.sin(beat * 0.5 + offset) * 0.04 * energy * motion;

      // arms move rhythmically (instrument-appropriate)
      if (leftArm.current && rightArm.current) {
        const armSwing = Math.sin(beat + offset) * (0.4 + energy * 0.5) * motion;
        if (member.instrumentType === "drum" || member.instrumentType === "piano") {
          // alternating hands: drum taps / piano keys + chain rattles
          leftArm.current.rotation.x = -0.6 - Math.abs(Math.sin(beat + offset)) * 0.5 * motion;
          rightArm.current.rotation.x = -0.6 - Math.abs(Math.sin(beat + offset + 1.5)) * 0.5 * motion;
        } else if (member.instrumentType === "fiddle") {
          // bowing: one arm saws back and forth
          rightArm.current.rotation.x = -0.5 + Math.sin(beat * 2 + offset) * 0.4 * motion;
          leftArm.current.rotation.x = -0.7;
        } else if (member.instrumentType === "flute") {
          leftArm.current.rotation.x = -0.9;
          rightArm.current.rotation.x = -0.9 + Math.sin(beat + offset) * 0.08 * motion;
        } else {
          // lute strum
          rightArm.current.rotation.x = -0.5 + armSwing * 0.3;
          leftArm.current.rotation.x = -0.6;
        }
      }

      // head bob
      if (head.current) {
        head.current.rotation.x = Math.sin(beat + offset) * 0.08 * energy * motion;
      }
    } else {
      // idle: breathing
      const breathe = Math.sin(t * 1.4 + offset) * 0.015 * motion;
      group.current.position.y = member.position[1] + breathe;
      group.current.rotation.z = Math.sin(t * 0.6 + offset) * 0.01 * motion;
      if (leftArm.current) leftArm.current.rotation.x = -0.55 + Math.sin(t + offset) * 0.02;
      if (rightArm.current) rightArm.current.rotation.x = -0.55 + Math.cos(t + offset) * 0.02;
      if (head.current) head.current.rotation.x = Math.sin(t * 0.8 + offset) * 0.03 * motion;
    }
  });

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    focusMember(isFocused ? null : member.id);
  };

  const highlight = hovered || isFocused;

  return (
    <group
      ref={group}
      position={member.position}
      rotation={member.rotation}
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
      <Figure
        look={member.look}
        pose="seated"
        stool
        highlight={highlight}
        highlightColor={member.color}
        refs={{ head, leftArm, rightArm }}
        armPose={{ leftElbow: -1.25, rightElbow: -1.25 }}
      />

      {/* Instrument held in front. The piano is furniture, not part of the
          player — swallow its pointer events so only Joan himself is
          clickable, not the whole case. */}
      <group
        position={[0, instrY, instrZ]}
        {...(member.instrumentType === "piano"
          ? {
              onClick: (e: { stopPropagation: () => void }) => e.stopPropagation(),
              onPointerOver: (e: { stopPropagation: () => void }) => e.stopPropagation(),
            }
          : {})}
      >
        <Instrument
          type={member.instrumentType}
          playing={isPlaying && !!song}
          intensity={energy}
        />
      </group>

      {/* Hover tooltip */}
      {hovered && !isFocused && (
        <Html position={[0, tipY, 0]} center distanceFactor={8} zIndexRange={[10, 0]}>
          <div className="pointer-events-none whitespace-nowrap border-2 border-tavern-gold bg-tavern-shadow/95 px-2.5 py-1 text-[11px] text-tavern-linen font-mono uppercase tracking-wider shadow-brutal-cobalt">
            Meet {member.name}
          </div>
        </Html>
      )}

      {/* Focus ring on ground */}
      {isFocused && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.34, 0.42, 24]} />
          <meshBasicMaterial color="#e7c66a" transparent opacity={0.7} />
        </mesh>
      )}
    </group>
  );
}

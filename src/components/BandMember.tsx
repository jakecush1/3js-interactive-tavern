import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { Group } from "three";
import type { BandMember as BandMemberData } from "../data/bandMembers";
import { useGameStore } from "../lib/useGameStore";
import { getSong } from "../data/songs";
import Instrument from "./Instrument";
import Figure, { figureMetrics, useRig } from "./characters/Figure";
import { poseMusician } from "./characters/animation";

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
  const rig = useRig();

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
    const live = isPlaying && !!song;
    // playing: the song's beat drives the pose at the mood's energy;
    // idle: a slow, faint fidget on a lazy 36 bpm
    const beat = live ? t * bpmRate * Math.PI : t * 0.6 * Math.PI;
    poseMusician(rig, {
      instrument: member.instrumentType,
      beat,
      energy: (live ? 0.45 + energy * 0.55 : 0.18) * motion,
      seed: offset,
      t,
    });
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
        refs={rig}
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

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Html } from "@react-three/drei";
import type { Group } from "three";
import { useGameStore } from "../lib/useGameStore";
import { glowAnchors } from "../lib/glow";

// SONG TRIGGER
// Wraps a character (the horse, the drunks) so clicking it plays a song,
// with the same hover cursor, glow and tooltip as the clickable props.
// Children are rendered in the wrapper's local space; glowY / labelY are
// heights above the wrapper's origin (normally the floor).

type Props = {
  songId: string;
  label: string;
  glowY?: number;
  labelY?: number;
  children: ReactNode;
};

export default function SongTrigger({ songId, label, glowY = 1.1, labelY = 2.1, children }: Props) {
  const selectSong = useGameStore((s) => s.selectSong);
  const isActive = useGameStore((s) => s.currentSongId === songId);
  // glow lights follow this point at body height, not the feet
  const glowPoint = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);

  // While this song plays, the shared "active" glow light stays here.
  useEffect(() => {
    const me = glowPoint.current;
    if (isActive) glowAnchors.active = me;
    return () => {
      if (glowAnchors.active === me) glowAnchors.active = null;
    };
  }, [isActive]);

  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        selectSong(songId);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        glowAnchors.hover = glowPoint.current;
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        if (glowAnchors.hover === glowPoint.current) glowAnchors.hover = null;
        document.body.style.cursor = "auto";
      }}
    >
      <group ref={glowPoint} position={[0, glowY, 0]} />
      {hovered && (
        <Html position={[0, labelY, 0]} center distanceFactor={9}>
          <div className="pointer-events-none whitespace-nowrap border-2 border-tavern-gold bg-tavern-shadow/95 px-2.5 py-1 text-[11px] text-tavern-linen font-mono uppercase tracking-wider shadow-brutal-cobalt">
            {label}
          </div>
        </Html>
      )}
      {children}
    </group>
  );
}

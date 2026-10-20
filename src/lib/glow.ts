import type { Object3D } from "three";

// GLOW REGISTRY
// The song triggers and the barmaid used to mount their own point light on
// hover. Every time the number of lights in a three.js scene changes, every
// lit material is recompiled — with this many materials that is a visible
// freeze on each hover. Instead, two permanent lights live in the scene
// (see components/GlowLights.tsx) and follow whichever object registers
// itself here: one for the hovered prop, one for the trigger of the song
// that is currently playing.

export const glowAnchors = {
  hover: null as Object3D | null,
  active: null as Object3D | null,
};

export const HOVER_COLOR = "#e7c66a";
export const ACTIVE_COLOR = "#ffd97a";

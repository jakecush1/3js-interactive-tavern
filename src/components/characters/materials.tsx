import { useMemo } from "react";
import { MeshStandardMaterial } from "three";
import {
  burlapTexture,
  clothTexture,
  leatherTexture,
  metalTexture,
  skinTexture,
  woodTexture,
} from "../../lib/textures";

// Shared material components so every character and prop gets textured,
// consistently lit surfaces instead of flat colour fills.
//
// Materials are cached by their parameters and shared between meshes
// (hundreds of meshes use "cloth in this colour"), which keeps the
// renderer from juggling a thousand near-identical material objects.

const cache = new Map<string, MeshStandardMaterial>();

function shared(key: string, make: () => MeshStandardMaterial) {
  let m = cache.get(key);
  if (!m) {
    m = make();
    cache.set(key, m);
  }
  return m;
}

function useShared(key: string, make: () => MeshStandardMaterial) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const mat = useMemo(() => shared(key, make), [key]);
  return <primitive object={mat} attach="material" />;
}

type Glow = { emissive?: string; emissiveIntensity?: number };

export function Cloth({ color, roughness = 0.92, coarse = false, ...glow }: { color: string; roughness?: number; coarse?: boolean } & Glow) {
  const e = glow.emissive ?? "#000000";
  const ei = glow.emissiveIntensity ?? 0;
  return useShared(`cloth|${color}|${roughness}|${coarse}|${e}|${ei}`, () => {
    const tex = coarse ? burlapTexture() : clothTexture();
    return new MeshStandardMaterial({ map: tex, bumpMap: tex, bumpScale: coarse ? 0.7 : 0.35, color, roughness, emissive: e, emissiveIntensity: ei });
  });
}

export function Leather({ color, roughness = 0.62, ...glow }: { color: string; roughness?: number } & Glow) {
  const e = glow.emissive ?? "#000000";
  const ei = glow.emissiveIntensity ?? 0;
  return useShared(`leather|${color}|${roughness}|${e}|${ei}`, () => {
    const tex = leatherTexture();
    return new MeshStandardMaterial({ map: tex, bumpMap: tex, bumpScale: 0.5, color, roughness, emissive: e, emissiveIntensity: ei });
  });
}

export function Skin({ color, roughness = 0.58 }: { color: string; roughness?: number }) {
  return useShared(`skin|${color}|${roughness}`, () => {
    const tex = skinTexture();
    return new MeshStandardMaterial({ map: tex, bumpMap: tex, bumpScale: 0.12, color, roughness });
  });
}

export function Metal({ color = "#c9ccd2", roughness = 0.38, metalness = 0.75 }: { color?: string; roughness?: number; metalness?: number }) {
  return useShared(`metal|${color}|${roughness}|${metalness}`, () => {
    const tex = metalTexture();
    return new MeshStandardMaterial({ map: tex, bumpMap: tex, bumpScale: 0.25, color, roughness, metalness });
  });
}

export function Wood({
  color = "#ffffff",
  base = "#6e4a26",
  dark = "#2a1708",
  planks = 4,
  repeat = [1, 1] as [number, number],
  roughness = 0.78,
}: {
  color?: string;
  base?: string;
  dark?: string;
  planks?: number;
  repeat?: [number, number];
  roughness?: number;
}) {
  return useShared(`wood|${color}|${base}|${dark}|${planks}|${repeat[0]}x${repeat[1]}|${roughness}`, () => {
    const tex = woodTexture({ base, dark, planks, repeat });
    return new MeshStandardMaterial({ map: tex, bumpMap: tex, bumpScale: 0.6, color, roughness });
  });
}

export function Hair({ color }: { color: string }) {
  return useShared(`hair|${color}`, () => new MeshStandardMaterial({ map: clothTexture([2, 2]), color, roughness: 0.95 }));
}

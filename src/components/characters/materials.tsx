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

type Glow = { emissive?: string; emissiveIntensity?: number };

export function Cloth({ color, roughness = 0.92, coarse = false, ...glow }: { color: string; roughness?: number; coarse?: boolean } & Glow) {
  return (
    <meshStandardMaterial
      map={coarse ? burlapTexture() : clothTexture()}
      bumpMap={coarse ? burlapTexture() : clothTexture()}
      bumpScale={coarse ? 0.7 : 0.35}
      color={color}
      roughness={roughness}
      emissive={glow.emissive ?? "#000000"}
      emissiveIntensity={glow.emissiveIntensity ?? 0}
    />
  );
}

export function Leather({ color, roughness = 0.62, ...glow }: { color: string; roughness?: number } & Glow) {
  return (
    <meshStandardMaterial
      map={leatherTexture()}
      bumpMap={leatherTexture()}
      bumpScale={0.5}
      color={color}
      roughness={roughness}
      emissive={glow.emissive ?? "#000000"}
      emissiveIntensity={glow.emissiveIntensity ?? 0}
    />
  );
}

export function Skin({ color, roughness = 0.58 }: { color: string; roughness?: number }) {
  return <meshStandardMaterial map={skinTexture()} bumpMap={skinTexture()} bumpScale={0.12} color={color} roughness={roughness} />;
}

export function Metal({ color = "#c9ccd2", roughness = 0.38, metalness = 0.75 }: { color?: string; roughness?: number; metalness?: number }) {
  return <meshStandardMaterial map={metalTexture()} bumpMap={metalTexture()} bumpScale={0.25} color={color} roughness={roughness} metalness={metalness} />;
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
  const tex = woodTexture({ base, dark, planks, repeat });
  return <meshStandardMaterial map={tex} bumpMap={tex} bumpScale={0.6} color={color} roughness={roughness} />;
}

export function Hair({ color }: { color: string }) {
  return <meshStandardMaterial map={clothTexture([2, 2])} color={color} roughness={0.95} />;
}

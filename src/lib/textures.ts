import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";

// PROCEDURAL TEXTURES
// Every surface in the tavern used to be a flat colour, which is what made
// the whole room read like construction paper. These generators paint
// wood grain, stone, plaster, cloth weave, leather, rugs and banners onto
// canvases at runtime (no image downloads), cached by key so each texture
// is built once and shared by every mesh that uses it.

type Ctx = CanvasRenderingContext2D;
type Rng = () => number;

function mulberry(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));

export function shade(hex: string, f: number) {
  const [r, g, b] = hexToRgb(hex);
  return `rgb(${clamp(r * f)},${clamp(g * f)},${clamp(b * f)})`;
}

function rgba(hex: string, a: number, f = 1) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${clamp(r * f)},${clamp(g * f)},${clamp(b * f)},${a})`;
}

// Per-pixel grain: random brightness jitter, the single biggest thing that
// stops a flat fill looking like paper.
function grain(ctx: Ctx, w: number, h: number, rng: Rng, amount: number) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rng() - 0.5) * 2 * amount;
    d[i] = clamp(d[i] + n);
    d[i + 1] = clamp(d[i + 1] + n);
    d[i + 2] = clamp(d[i + 2] + n);
  }
  ctx.putImageData(img, 0, 0);
}

// Soft blotches (damp stains, worn patches, soot) via radial gradients.
function blotches(ctx: Ctx, w: number, h: number, rng: Rng, color: string, n: number, alpha: number) {
  for (let i = 0; i < n; i++) {
    const x = rng() * w;
    const y = rng() * h;
    const r = (0.08 + rng() * 0.25) * Math.max(w, h);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(color, alpha));
    g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

const cache = new Map<string, CanvasTexture>();

function make(
  key: string,
  w: number,
  h: number,
  repeat: [number, number],
  draw: (ctx: Ctx, w: number, h: number, rng: Rng) => void,
  srgb = true
) {
  const fullKey = `${key}|${repeat[0]}x${repeat[1]}`;
  const hit = cache.get(fullKey);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  const tex = new CanvasTexture(c);
  if (ctx) draw(ctx, w, h, mulberry(hash(key)));
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  if (srgb) tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  cache.set(fullKey, tex);
  return tex;
}

// ---------------------------------------------------------------------------
// WOOD — planks with wandering grain, knots, per-plank tint and dark seams.

export type WoodOpts = {
  base?: string;
  dark?: string;
  planks?: number;
  horizontal?: boolean;
  repeat?: [number, number];
  size?: number;
};

export function woodTexture({
  base = "#7a5230",
  dark = "#2c1a0b",
  planks = 6,
  horizontal = false,
  repeat = [1, 1],
  size = 512,
}: WoodOpts = {}) {
  const key = `wood:${base}:${dark}:${planks}:${horizontal ? "h" : "v"}:${size}`;
  return make(key, size, size, repeat, (ctx, w, h, rng) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    const span = horizontal ? h : w;
    const plankW = span / planks;
    for (let p = 0; p < planks; p++) {
      const start = p * plankW;
      const tint = 0.82 + rng() * 0.34;
      ctx.fillStyle = shade(base, tint);
      if (horizontal) ctx.fillRect(0, start, w, plankW);
      else ctx.fillRect(start, 0, plankW, h);

      // grain lines running the length of the plank
      const lines = 26 + Math.floor(rng() * 20);
      for (let i = 0; i < lines; i++) {
        const off = start + rng() * plankW;
        const wob = (rng() - 0.5) * plankW * 0.35;
        ctx.strokeStyle = rgba(dark, 0.05 + rng() * 0.2, 0.9 + rng() * 0.4);
        ctx.lineWidth = 0.6 + rng() * 1.8;
        ctx.beginPath();
        if (horizontal) {
          ctx.moveTo(0, off);
          ctx.bezierCurveTo(w * 0.3, off + wob, w * 0.7, off - wob, w, off + wob * 0.3);
        } else {
          ctx.moveTo(off, 0);
          ctx.bezierCurveTo(off + wob, h * 0.3, off - wob, h * 0.7, off + wob * 0.3, h);
        }
        ctx.stroke();
      }

      // knots: concentric rings
      const knots = rng() < 0.6 ? 1 : rng() < 0.3 ? 2 : 0;
      for (let k = 0; k < knots; k++) {
        const kx = horizontal ? rng() * w : start + plankW * (0.25 + rng() * 0.5);
        const ky = horizontal ? start + plankW * (0.25 + rng() * 0.5) : rng() * h;
        const kr = plankW * (0.12 + rng() * 0.18);
        for (let r = kr; r > 2; r *= 0.72) {
          ctx.strokeStyle = rgba(dark, 0.25, 1);
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.ellipse(kx, ky, r * (horizontal ? 1.7 : 1), r * (horizontal ? 1 : 1.7), 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.fillStyle = rgba(dark, 0.55);
        ctx.beginPath();
        ctx.ellipse(kx, ky, 3, 4, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // end joint partway along some planks
      if (rng() < 0.7) {
        const j = rng() * (horizontal ? w : h);
        ctx.fillStyle = rgba(dark, 0.8);
        if (horizontal) ctx.fillRect(j, start, 3, plankW);
        else ctx.fillRect(start, j, plankW, 3);
      }

      // seam between planks: dark groove with a pale highlight edge
      ctx.fillStyle = rgba(dark, 0.95);
      if (horizontal) ctx.fillRect(0, start, w, 4);
      else ctx.fillRect(start, 0, 4, h);
      ctx.fillStyle = "rgba(255,230,190,0.12)";
      if (horizontal) ctx.fillRect(0, start + 4, w, 2);
      else ctx.fillRect(start + 4, 0, 2, h);
    }
    blotches(ctx, w, h, rng, dark, 10, 0.18);
    grain(ctx, w, h, rng, 9);
  });
}

// ---------------------------------------------------------------------------
// STONE — coursed rubble blocks with mortar.

export function stoneTexture({
  base = "#8a7658",
  mortar = "#4a3d2c",
  rows = 7,
  repeat = [1, 1] as [number, number],
  size = 512,
} = {}) {
  const key = `stone:${base}:${mortar}:${rows}:${size}`;
  return make(key, size, size, repeat, (ctx, w, h, rng) => {
    ctx.fillStyle = mortar;
    ctx.fillRect(0, 0, w, h);
    const rowH = h / rows;
    for (let r = 0; r < rows; r++) {
      let x = -rng() * rowH;
      const y = r * rowH;
      while (x < w) {
        const bw = rowH * (1.1 + rng() * 1.6);
        const gap = 4 + rng() * 3;
        const tint = 0.75 + rng() * 0.45;
        ctx.fillStyle = shade(base, tint);
        const bx = x + gap / 2;
        const by = y + gap / 2;
        const bwi = bw - gap;
        const bhi = rowH - gap;
        ctx.beginPath();
        ctx.moveTo(bx + 3, by);
        ctx.lineTo(bx + bwi - 2, by + 1);
        ctx.lineTo(bx + bwi, by + bhi - 3);
        ctx.lineTo(bx + 1, by + bhi);
        ctx.closePath();
        ctx.fill();
        // bevel highlight / shadow
        ctx.strokeStyle = "rgba(255,240,210,0.18)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bx + 2, by + bhi - 1);
        ctx.lineTo(bx + 2, by + 1);
        ctx.lineTo(bx + bwi - 2, by + 1);
        ctx.stroke();
        ctx.strokeStyle = "rgba(0,0,0,0.3)";
        ctx.beginPath();
        ctx.moveTo(bx + bwi - 1, by + 2);
        ctx.lineTo(bx + bwi - 1, by + bhi - 1);
        ctx.lineTo(bx + 2, by + bhi - 1);
        ctx.stroke();
        x += bw;
      }
    }
    blotches(ctx, w, h, rng, "#2a2018", 14, 0.25);
    blotches(ctx, w, h, rng, "#d8c8a0", 6, 0.12);
    grain(ctx, w, h, rng, 14);
  });
}

// ---------------------------------------------------------------------------
// PLASTER — limewashed wall with stains and hairline cracks.

export function plasterTexture({
  base = "#cdb995",
  repeat = [1, 1] as [number, number],
  size = 512,
} = {}) {
  const key = `plaster:${base}:${size}`;
  return make(key, size, size, repeat, (ctx, w, h, rng) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    blotches(ctx, w, h, rng, "#6b5438", 18, 0.22);
    blotches(ctx, w, h, rng, "#f3e9d0", 10, 0.2);
    // cracks
    for (let i = 0; i < 7; i++) {
      let x = rng() * w;
      let y = rng() * h;
      ctx.strokeStyle = "rgba(60,40,20,0.35)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      const segs = 6 + Math.floor(rng() * 10);
      for (let s = 0; s < segs; s++) {
        x += (rng() - 0.5) * 30;
        y += rng() * 22;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    grain(ctx, w, h, rng, 10);
  });
}

// ---------------------------------------------------------------------------
// CLOTH — near-white weave meant to be tinted by material.color.

export function clothTexture(repeat: [number, number] = [4, 4], size = 256) {
  return make(`cloth:${size}`, size, size, repeat, (ctx, w, h, rng) => {
    ctx.fillStyle = "#f4f4f4";
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 3) {
      ctx.fillStyle = `rgba(0,0,0,${0.05 + rng() * 0.07})`;
      ctx.fillRect(0, y, w, 1);
    }
    for (let x = 0; x < w; x += 3) {
      ctx.fillStyle = `rgba(0,0,0,${0.05 + rng() * 0.07})`;
      ctx.fillRect(x, 0, 1, h);
    }
    blotches(ctx, w, h, rng, "#000000", 6, 0.08);
    grain(ctx, w, h, rng, 7);
  });
}

// Coarse burlap / homespun — bigger weave, for peasants and rags.
export function burlapTexture(repeat: [number, number] = [3, 3], size = 256) {
  return make(`burlap:${size}`, size, size, repeat, (ctx, w, h, rng) => {
    ctx.fillStyle = "#ededea";
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 6) {
      ctx.fillStyle = `rgba(0,0,0,${0.12 + rng() * 0.1})`;
      ctx.fillRect(0, y, w, 2);
    }
    for (let x = 0; x < w; x += 6) {
      ctx.fillStyle = `rgba(0,0,0,${0.12 + rng() * 0.1})`;
      ctx.fillRect(x, 0, 2, h);
    }
    grain(ctx, w, h, rng, 12);
  });
}

// ---------------------------------------------------------------------------
// LEATHER — tinted by colour; pores, creases and wear.

export function leatherTexture(repeat: [number, number] = [2, 2], size = 256) {
  return make(`leather:${size}`, size, size, repeat, (ctx, w, h, rng) => {
    ctx.fillStyle = "#e9e3d8";
    ctx.fillRect(0, 0, w, h);
    blotches(ctx, w, h, rng, "#000000", 14, 0.14);
    blotches(ctx, w, h, rng, "#ffffff", 8, 0.18);
    for (let i = 0; i < 90; i++) {
      ctx.strokeStyle = `rgba(0,0,0,${0.08 + rng() * 0.14})`;
      ctx.lineWidth = 0.8;
      const x = rng() * w;
      const y = rng() * h;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rng() - 0.5) * 28, y + (rng() - 0.5) * 28);
      ctx.stroke();
    }
    grain(ctx, w, h, rng, 14);
  });
}

// ---------------------------------------------------------------------------
// SKIN — faint pores and freckles; tinted by colour.

export function skinTexture(size = 256) {
  return make(`skin:${size}`, size, size, [1, 1], (ctx, w, h, rng) => {
    ctx.fillStyle = "#f6f1ec";
    ctx.fillRect(0, 0, w, h);
    blotches(ctx, w, h, rng, "#c47a66", 10, 0.09);
    for (let i = 0; i < 160; i++) {
      ctx.fillStyle = `rgba(120,70,40,${0.05 + rng() * 0.08})`;
      ctx.beginPath();
      ctx.arc(rng() * w, rng() * h, 0.6 + rng() * 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
    grain(ctx, w, h, rng, 4);
  });
}

// ---------------------------------------------------------------------------
// METAL — brushed steel; tinted by colour, meant for metalness ~0.7.

export function metalTexture(size = 256) {
  return make(`metal:${size}`, size, size, [1, 1], (ctx, w, h, rng) => {
    ctx.fillStyle = "#e4e4e6";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 500; i++) {
      ctx.strokeStyle = `rgba(0,0,0,${0.03 + rng() * 0.1})`;
      ctx.lineWidth = 0.7;
      const y = rng() * h;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y + (rng() - 0.5) * 3);
      ctx.stroke();
    }
    blotches(ctx, w, h, rng, "#000000", 10, 0.12);
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = `rgba(0,0,0,${0.15 + rng() * 0.25})`;
      ctx.beginPath();
      ctx.arc(rng() * w, rng() * h, 1 + rng() * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    grain(ctx, w, h, rng, 6);
  });
}

// ---------------------------------------------------------------------------
// RUG — round oriental carpet: gold outer band, navy guard with lozenges,
// crimson field, eight-point medallion. Drawn centred for a circle mesh.

export function rugTexture({
  field = "#6b1f2a",
  gold = "#c9a24b",
  navy = "#1f2a4a",
  size = 1024,
} = {}) {
  return make(`rug:${field}:${gold}:${navy}:${size}`, size, size, [1, 1], (ctx, w, h, rng) => {
    const cx = w / 2;
    const cy = h / 2;
    const R = w / 2;
    const ring = (r0: number, r1: number, color: string) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx, cy, r1, 0, Math.PI * 2);
      ctx.arc(cx, cy, r0, 0, Math.PI * 2, true);
      ctx.fill();
    };
    ctx.fillStyle = field;
    ctx.fillRect(0, 0, w, h);
    ring(R * 0.9, R, gold);
    ring(R * 0.87, R * 0.9, navy);
    ring(R * 0.76, R * 0.87, navy);
    ring(R * 0.745, R * 0.76, gold);
    // lozenges around the navy guard band
    const n = 28;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = R * 0.815;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      ctx.fillStyle = gold;
      ctx.beginPath();
      ctx.moveTo(-R * 0.035, 0);
      ctx.lineTo(0, -R * 0.022);
      ctx.lineTo(R * 0.035, 0);
      ctx.lineTo(0, R * 0.022);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = field;
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.008, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // vine scroll on the field
    ctx.strokeStyle = rgba(gold, 0.55);
    ctx.lineWidth = R * 0.008;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * R * 0.55, cy + Math.sin(a) * R * 0.55, R * 0.07, a, a + Math.PI * 1.4);
      ctx.stroke();
    }
    // central medallion: two rotated squares and an inner star
    const star = (r: number, color: string, points: number, inner: number) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      for (let i = 0; i < points * 2; i++) {
        const a = (i / (points * 2)) * Math.PI * 2;
        const rr = i % 2 === 0 ? r : r * inner;
        const x = cx + Math.cos(a) * rr;
        const y = cy + Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    };
    star(R * 0.36, gold, 8, 0.78);
    star(R * 0.33, navy, 8, 0.78);
    star(R * 0.25, gold, 8, 0.55);
    star(R * 0.2, field, 8, 0.55);
    star(R * 0.1, gold, 8, 0.5);
    ctx.fillStyle = navy;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.035, 0, Math.PI * 2);
    ctx.fill();
    // woven pile: fine horizontal weave lines + grain
    for (let y = 0; y < h; y += 4) {
      ctx.fillStyle = `rgba(0,0,0,${0.05 + rng() * 0.06})`;
      ctx.fillRect(0, y, w, 1);
    }
    blotches(ctx, w, h, rng, "#000000", 10, 0.2);
    grain(ctx, w, h, rng, 9);
  });
}

// ---------------------------------------------------------------------------
// BANNER — heraldic hanging: coloured field, gold border, emblem, fringe.

export function bannerTexture({
  field = "#6b1f2a",
  gold = "#c9a24b",
  emblem = "cross" as "cross" | "star" | "chevron" | "lion",
  size = 256,
} = {}) {
  return make(`banner:${field}:${gold}:${emblem}:${size}`, size, size * 2, [1, 1], (ctx, w, h, rng) => {
    ctx.fillStyle = field;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = gold;
    ctx.lineWidth = w * 0.045;
    ctx.strokeRect(w * 0.07, h * 0.04, w * 0.86, h * 0.86);
    ctx.lineWidth = w * 0.012;
    ctx.strokeRect(w * 0.13, h * 0.075, w * 0.74, h * 0.79);
    ctx.fillStyle = gold;
    const cx = w / 2;
    const cy = h * 0.42;
    if (emblem === "cross") {
      const arm = w * 0.09;
      const len = w * 0.3;
      ctx.fillRect(cx - arm / 2, cy - len, arm, len * 2);
      ctx.fillRect(cx - len * 0.8, cy - arm / 2 - len * 0.25, len * 1.6, arm);
      // flared tips
      [[cx, cy - len], [cx, cy + len], [cx - len * 0.8, cy - len * 0.25], [cx + len * 0.8, cy - len * 0.25]].forEach(
        ([x, y]) => {
          ctx.beginPath();
          ctx.arc(x, y, arm * 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
      );
    } else if (emblem === "star") {
      ctx.beginPath();
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
        const r = i % 2 === 0 ? w * 0.3 : w * 0.13;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    } else if (emblem === "chevron") {
      ctx.lineWidth = w * 0.1;
      ctx.strokeStyle = gold;
      for (let k = 0; k < 3; k++) {
        const y = h * (0.28 + k * 0.17);
        ctx.beginPath();
        ctx.moveTo(w * 0.2, y + h * 0.1);
        ctx.lineTo(cx, y);
        ctx.lineTo(w * 0.8, y + h * 0.1);
        ctx.stroke();
      }
    } else {
      // rampant lion, roughly: body, head, limbs, tail as blobs
      ctx.beginPath();
      ctx.ellipse(cx, cy + h * 0.02, w * 0.11, h * 0.11, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + w * 0.11, cy - h * 0.1, w * 0.07, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = w * 0.045;
      ctx.lineCap = "round";
      const limb = (x0: number, y0: number, x1: number, y1: number) => {
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      };
      limb(cx + w * 0.06, cy - h * 0.03, cx + w * 0.22, cy - h * 0.14);
      limb(cx + w * 0.02, cy, cx + w * 0.2, cy - h * 0.05);
      limb(cx - w * 0.05, cy + h * 0.08, cx - w * 0.05, cy + h * 0.2);
      limb(cx + w * 0.03, cy + h * 0.08, cx + w * 0.12, cy + h * 0.19);
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.1, cy + h * 0.02);
      ctx.quadraticCurveTo(cx - w * 0.3, cy - h * 0.05, cx - w * 0.2, cy - h * 0.17);
      ctx.stroke();
    }
    // fringe along the bottom
    ctx.fillStyle = gold;
    for (let x = w * 0.07; x < w * 0.93; x += w * 0.045) {
      ctx.fillRect(x, h * 0.91, w * 0.022, h * 0.07);
    }
    // weave + wear
    for (let y = 0; y < h; y += 3) {
      ctx.fillStyle = `rgba(0,0,0,${0.04 + rng() * 0.05})`;
      ctx.fillRect(0, y, w, 1);
    }
    blotches(ctx, w, h, rng, "#000000", 8, 0.2);
    grain(ctx, w, h, rng, 8);
  });
}

// ---------------------------------------------------------------------------
// LEADED WINDOW — diamond quarries with lead cames, faintly luminous.

export function windowTexture(size = 256) {
  return make(`window:${size}`, size, size, [1, 1], (ctx, w, h, rng) => {
    ctx.fillStyle = "#6f7f8a";
    ctx.fillRect(0, 0, w, h);
    // pane tint variation
    const cell = w / 6;
    for (let y = -1; y < 7; y++) {
      for (let x = -1; x < 7; x++) {
        ctx.fillStyle = `rgba(${150 + rng() * 60},${165 + rng() * 50},${170 + rng() * 60},0.55)`;
        ctx.beginPath();
        ctx.moveTo((x + 0.5) * cell, y * cell);
        ctx.lineTo((x + 1) * cell, (y + 0.5) * cell);
        ctx.lineTo((x + 0.5) * cell, (y + 1) * cell);
        ctx.lineTo(x * cell, (y + 0.5) * cell);
        ctx.closePath();
        ctx.fill();
      }
    }
    // lead cames
    ctx.strokeStyle = "#1a1a1c";
    ctx.lineWidth = 4;
    for (let i = -6; i < 12; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cell, 0);
      ctx.lineTo(i * cell + h, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(i * cell, 0);
      ctx.lineTo(i * cell - h, h);
      ctx.stroke();
    }
    blotches(ctx, w, h, rng, "#ffffff", 5, 0.25);
    grain(ctx, w, h, rng, 6);
  });
}

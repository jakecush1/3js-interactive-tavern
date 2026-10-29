import { useMemo, useRef, type ReactNode, type RefObject } from "react";
import { useLoader } from "@react-three/fiber";
import { CanvasTexture, LatheGeometry, SRGBColorSpace, TextureLoader, Vector2, type Group } from "three";
import { Cloth, Hair, Leather, Metal, Skin, Wood } from "./materials";

// FIGURE
// A procedural Renaissance person. Everything in the tavern that walks,
// sits, dances or drinks is assembled from this kit: a human body built to
// real proportions (about seven and a half heads tall, shoulders two heads
// wide, fingertips at mid thigh) with turned, muscle-shaped limbs — deltoid,
// biceps, forearm, thigh, calf, a waist between the ribcage and the hips —
// under period clothing (doublets with slashed or puffed sleeves, ruffs,
// belts, aprons, corsets, plate armour, rags). Band members wear their
// actual faces: a transparent head cutout is wrapped onto a curved surface
// at the front of a 3D skull so it still reads as a head with volume from
// the side.
//
// Skeleton. Every joint is a group that animation code can drive, and all
// of them except the arms are ZERO-BASED: the rest pose (hip height, the
// seated bend of the legs, a build's hunch) lives on a wrapper group, so an
// animation sets rotations from zero no matter how the figure is posed.
// The arm pivots carry their `armPose` rest rotation themselves, because
// the musicians set absolute arm angles.
//
//   root (floor)
//   └ pelvis ........ bob / sway / hip roll
//     ├ leftLeg, rightLeg (hip) → shin (knee) → foot (ankle)
//     ├ skirt
//     └ torso ....... spine: lean, twist
//       ├ leftArm, rightArm (shoulder) → forearm (elbow) → hand
//       └ head (neck)
//
// `useRig()` hands back a full set of refs; the pose functions in
// ./animation.ts (walk, dance, stagger) write into them each frame.

export type Build = "stout" | "lanky" | "portly" | "broad" | "slim";

export type FigureLook = {
  build?: Build;
  skin?: string;
  outfit?: {
    kind?: "doublet" | "tunic" | "armor" | "dress" | "rags" | "shirt";
    color?: string;
    accent?: string;
    sleeves?: "puffed" | "slashed" | "plain" | "rolled";
    sleeveColor?: string;
    collar?: "ruff" | "turtleneck" | "flat" | "hood" | "none";
    apron?: string;
    corset?: string;
    belt?: boolean;
    cloak?: string;
    suspenders?: string;
    vest?: string;
    harness?: string; // leather X-straps over the chest (and vest), buckled
    baldric?: string; // single diagonal strap, shoulder to hip
    necklace?: "chain" | "beads";
    undershirt?: string; // shows as a V at the chest under rags / tunics
    towel?: boolean | string; // bar towel tucked into the belt (true = linen, or a colour)
    wristCuffs?: string; // leather bands at the wrists
    pouch?: string; // hip pouch, independent of the belt
  };
  legs?: { hose?: string; boots?: string; skirt?: string; greaves?: boolean; bootCuffs?: boolean };
  hair?: { style?: "bald" | "short" | "curly" | "messy" | "long" | "bun" | "scraggly"; color?: string };
  facialHair?: "none" | "mustache" | "stubble" | "beard" | "bigbeard" | "goatee" | "mustache-stubble";
  hat?: { kind?: "none" | "beret" | "beanie" | "cap" | "coif" | "bonnet"; color?: string; feather?: string };
  eyewear?: "none" | "shades" | "roundglasses";
  expression?: "smile" | "grin" | "laugh" | "neutral" | "sleepy";
  ears?: "human" | "pointed";
  nose?: "small" | "medium" | "big" | "long" | "red";
  eyeColor?: string;
  blush?: number;
  gloves?: string;
  // Real face: transparent PNG cutout of a head, wrapped onto the skull.
  // yaw turns the whole head on the neck (radians about Y, positive = to
  // the figure's left) for someone whose body faces away from the room,
  // like Joan side-on at his piano, but whose face the audience should see.
  face?: { url: string; back?: string; height?: number; keyTolerance?: number; yaw?: number };
};

export type Pivot = RefObject<Group | null>;

export type FigureRefs = {
  pelvis?: Pivot;
  torso?: Pivot;
  head?: Pivot;
  leftArm?: Pivot;
  rightArm?: Pivot;
  leftForearm?: Pivot;
  rightForearm?: Pivot;
  leftLeg?: Pivot;
  rightLeg?: Pivot;
  leftShin?: Pivot;
  rightShin?: Pivot;
  leftFoot?: Pivot;
  rightFoot?: Pivot;
  skirt?: Pivot;
};

// One ref per joint, for figures that are fully animated.
export function useRig(): Required<FigureRefs> {
  return {
    pelvis: useRef<Group>(null),
    torso: useRef<Group>(null),
    head: useRef<Group>(null),
    leftArm: useRef<Group>(null),
    rightArm: useRef<Group>(null),
    leftForearm: useRef<Group>(null),
    rightForearm: useRef<Group>(null),
    leftLeg: useRef<Group>(null),
    rightLeg: useRef<Group>(null),
    leftShin: useRef<Group>(null),
    rightShin: useRef<Group>(null),
    leftFoot: useRef<Group>(null),
    rightFoot: useRef<Group>(null),
    skirt: useRef<Group>(null),
  };
}

export type ArmPose = {
  left?: [number, number, number];
  right?: [number, number, number];
  leftElbow?: number;
  rightElbow?: number;
};

type Props = {
  look: FigureLook;
  pose: "seated" | "standing";
  refs?: FigureRefs;
  armPose?: ArmPose;
  highlight?: boolean;
  highlightColor?: string;
  heldLeft?: ReactNode;
  heldRight?: ReactNode;
  stool?: boolean;
  children?: ReactNode;
};

// Body proportions per build. torsoR is the chest half-width before the
// 1.2× lateral stretch of the torso (so the real half-width is 1.2·torsoR);
// torsoLen sets the distance from hips to shoulders together with it.
// Limb lengths are metres on a figure roughly 1.8 m tall.
const BUILDS: Record<
  Build,
  {
    torsoR: number;
    torsoLen: number;
    belly: number;
    shoulderW: number;
    headR: number;
    armR: number;
    armLen: number;
    foreLen: number;
    legScale: number;
    legR: number;
    hunch: number;
    neck: number;
  }
> = {
  stout: { torsoR: 0.15, torsoLen: 0.31, belly: 0, shoulderW: 0.2, headR: 0.16, armR: 0.05, armLen: 0.3, foreLen: 0.26, legScale: 1, legR: 0.082, hunch: 0, neck: 0.07 },
  slim: { torsoR: 0.13, torsoLen: 0.34, belly: 0, shoulderW: 0.185, headR: 0.155, armR: 0.042, armLen: 0.3, foreLen: 0.26, legScale: 1.02, legR: 0.072, hunch: 0, neck: 0.08 },
  lanky: { torsoR: 0.12, torsoLen: 0.52, belly: 0, shoulderW: 0.19, headR: 0.15, armR: 0.038, armLen: 0.37, foreLen: 0.33, legScale: 1.18, legR: 0.064, hunch: 0.32, neck: 0.09 },
  portly: { torsoR: 0.19, torsoLen: 0.3, belly: 0.38, shoulderW: 0.215, headR: 0.17, armR: 0.06, armLen: 0.28, foreLen: 0.24, legScale: 0.97, legR: 0.096, hunch: 0.05, neck: 0.055 },
  broad: { torsoR: 0.17, torsoLen: 0.36, belly: 0, shoulderW: 0.235, headR: 0.165, armR: 0.062, armLen: 0.31, foreLen: 0.27, legScale: 1.05, legR: 0.09, hunch: 0, neck: 0.07 },
};

const THIGH = 0.42;
const SHIN = 0.39;
const ANKLE = 0.07;
const HIP_X = 0.095;

const DEFAULT_SKIN = "#e4b48e";

// Turned body parts are shared between every figure that asks for the same
// shape, like the materials are.
const latheCache = new Map<string, LatheGeometry>();
function lathe(key: string, profile: [number, number][], segments = 14) {
  let g = latheCache.get(key);
  if (!g) {
    g = new LatheGeometry(
      profile.map(([x, y]) => new Vector2(x, y)),
      segments
    );
    latheCache.set(key, g);
  }
  return g;
}

// A limb segment hanging down -Y from its joint at the origin: radius is
// given as fractions of `r` along the length, top to bottom.
function limbGeo(name: string, len: number, r: number, shape: [number, number][]) {
  const key = `${name}|${len.toFixed(3)}|${r.toFixed(3)}`;
  const pts: [number, number][] = [];
  for (let i = shape.length - 1; i >= 0; i--) {
    const [t, k] = shape[i];
    pts.push([Math.max(0.001, r * k), -len * t]);
  }
  return lathe(key, pts, 12);
}

const UPPER_ARM: [number, number][] = [[0, 0.92], [0.12, 1.0], [0.3, 0.98], [0.5, 0.95], [0.72, 0.86], [0.9, 0.76], [1, 0.72]];
const FOREARM: [number, number][] = [[0, 0.74], [0.08, 0.84], [0.22, 0.86], [0.45, 0.76], [0.7, 0.6], [0.9, 0.5], [1, 0.48]];
const THIGH_SHAPE: [number, number][] = [[0, 0.98], [0.15, 1.0], [0.4, 0.95], [0.65, 0.86], [0.85, 0.74], [1, 0.68]];
const SHIN_SHAPE: [number, number][] = [[0, 0.7], [0.12, 0.78], [0.28, 0.8], [0.5, 0.68], [0.75, 0.52], [0.9, 0.44], [1, 0.42]];


// Head cutouts ship on a flat backdrop (white photo mattes, the grey of a
// character sheet, the dark field of a reference board) rather than real
// transparency, so key the backdrop out: sample its colour from the image
// border, flood-fill from the border over pixels close to it (eye whites
// and highlights inside the face are not connected to the border, so they
// survive), feather the edge, then trim to the opaque bounds so every face
// fills its panel the same way regardless of padding.
function useCutout(url: string, tolerance = 40) {
  const src = useLoader(TextureLoader, url);
  return useMemo(() => {
    const img = src.image as HTMLImageElement;
    const w = img.width;
    const h = img.height;
    const scan = document.createElement("canvas");
    scan.width = w;
    scan.height = h;
    const sctx = scan.getContext("2d");
    if (!sctx) return { tex: src, aspect: h / w };
    sctx.drawImage(img, 0, 0);
    const im = sctx.getImageData(0, 0, w, h);
    const d = im.data;
    const n = w * h;
    // backdrop colour = median of the border pixels
    const br: number[] = [], bgc: number[] = [], bb: number[] = [];
    const sample = (i: number) => {
      br.push(d[i * 4]);
      bgc.push(d[i * 4 + 1]);
      bb.push(d[i * 4 + 2]);
    };
    for (let x = 0; x < w; x += 2) {
      sample(x);
      sample((h - 1) * w + x);
    }
    for (let y = 0; y < h; y += 2) {
      sample(y * w);
      sample(y * w + w - 1);
    }
    const med = (a: number[]) => a.sort((p, q) => p - q)[a.length >> 1] ?? 0;
    const R = med(br), G = med(bgc), Bc = med(bb);
    const light = (R + G + Bc) / 3 > 170;
    const isBg = (i: number) => {
      if (d[i * 4 + 3] < 40) return true;
      const dr = d[i * 4] - R, dg = d[i * 4 + 1] - G, db = d[i * 4 + 2] - Bc;
      return Math.sqrt(dr * dr + dg * dg + db * db) < tolerance;
    };
    const bg = new Uint8Array(n);
    const stack: number[] = [];
    const push = (i: number) => {
      if (!bg[i] && isBg(i)) {
        bg[i] = 1;
        stack.push(i);
      }
    };
    for (let x = 0; x < w; x++) {
      push(x);
      push((h - 1) * w + x);
    }
    for (let y = 0; y < h; y++) {
      push(y * w);
      push(y * w + w - 1);
    }
    while (stack.length) {
      const i = stack.pop() as number;
      const x = i % w;
      const y = (i - x) / w;
      if (x > 0) push(i - 1);
      if (x < w - 1) push(i + 1);
      if (y > 0) push(i - w);
      if (y < h - 1) push(i + w);
    }
    let minX = w, minY = h, maxX = 0, maxY = 0;
    for (let i = 0; i < n; i++) {
      if (bg[i]) {
        d[i * 4 + 3] = 0;
        continue;
      }
      const x = i % w;
      const y = (i - x) / w;
      let edge = 0;
      if (x > 0 && bg[i - 1]) edge++;
      if (x < w - 1 && bg[i + 1]) edge++;
      if (y > 0 && bg[i - w]) edge++;
      if (y < h - 1 && bg[i + w]) edge++;
      if (edge) {
        d[i * 4 + 3] = Math.min(d[i * 4 + 3], edge > 1 ? 90 : 170);
        // kill the pale fringe a white matte leaves behind
        const mn = Math.min(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]);
        if (light && mn > 200) d[i * 4 + 3] = 60;
      }
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    sctx.putImageData(im, 0, 0);
    const cw = Math.max(1, maxX - minX + 1);
    const ch = Math.max(1, maxY - minY + 1);
    const out = document.createElement("canvas");
    out.width = cw;
    out.height = ch;
    const octx = out.getContext("2d");
    if (!octx) return { tex: src, aspect: h / w };
    octx.drawImage(scan, minX, minY, cw, ch, 0, 0, cw, ch);
    const tex = new CanvasTexture(out);
    tex.colorSpace = SRGBColorSpace;
    tex.anisotropy = 8;
    tex.premultiplyAlpha = false;
    return { tex, aspect: ch / cw };
  }, [src, tolerance]);
}

function PhotoHead({ url, back, height = 0.44, headR, tolerance, longHair }: { url: string; back: string; height?: number; headR: number; tolerance?: number; longHair?: string }) {
  const { tex, aspect } = useCutout(url, tolerance);
  const width = height / aspect;
  // curved panel: radius chosen so the chord matches the face width
  const r = Math.max(width * 0.75, 0.22);
  const theta = 2 * Math.asin(Math.min(0.98, width / 2 / r));
  const R = Math.min(headR * 1.1, height * 0.46);
  return (
    <group position={[0, height * 0.45, 0]}>
      {/* skull behind the cutout, in hair / skin colour, gives the head
          depth when seen from the side */}
      <mesh position={[0, -0.01, headR * 0.98 - R * 0.85]} scale={[0.82, 0.98, 0.85]} castShadow>
        <sphereGeometry args={[R, 20, 16]} />
        <Hair color={back} />
      </mesh>
      {longHair && (
        <group position={[0, -height * 0.1, -0.02]}>
          <mesh position={[0, -0.16, -0.1]} rotation={[0.12, 0, 0]}>
            <boxGeometry args={[Math.min(width, 0.3), 0.42, 0.08]} />
            <Hair color={longHair} />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * Math.min(width, 0.3) * 0.55, -0.14, -0.02]} rotation={[0, 0, side * -0.08]}>
              <boxGeometry args={[0.07, 0.36, 0.1]} />
              <Hair color={longHair} />
            </mesh>
          ))}
        </group>
      )}
      <mesh position={[0, 0, headR * 0.98 - r]} castShadow>
        <cylinderGeometry args={[r, r, height, 24, 1, true, -theta / 2, theta]} />
        <meshStandardMaterial
          map={tex}
          emissive="#ffffff"
          emissiveMap={tex}
          emissiveIntensity={0.28}
          alphaTest={0.5}
          roughness={0.85}
        />
      </mesh>
    </group>
  );
}

function Eye({ side, color, lid }: { side: number; color: string; lid: number }) {
  return (
    <group position={[side * 0.058, 0.02, 0.125]}>
      <mesh scale={[1, 0.85, 0.6]}>
        <sphereGeometry args={[0.03, 12, 10]} />
        <meshStandardMaterial color="#f3efe6" roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, 0.015]}>
        <sphereGeometry args={[0.015, 10, 8]} />
        <meshStandardMaterial color={color} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, 0.026]}>
        <sphereGeometry args={[0.0075, 8, 6]} />
        <meshStandardMaterial color="#120b05" roughness={0.2} />
      </mesh>
      {/* hooded upper lid: skin-coloured cap over the top of the eyeball */}
      <mesh position={[0, 0.004, -0.002]} scale={[1.08, 0.95, 0.75]}>
        <sphereGeometry args={[0.032, 12, 8, 0, Math.PI * 2, 0, Math.PI * lid]} />
        <meshStandardMaterial color="#d9a27c" roughness={0.6} />
      </mesh>
    </group>
  );
}

function ProceduralHead({ look, headR, skin }: { look: FigureLook; headR: number; skin: string }) {
  const hairColor = look.hair?.color ?? "#3a2616";
  const style = look.hair?.style ?? "short";
  const facial = look.facialHair ?? "none";
  const expr = look.expression ?? "smile";
  const nose = look.nose ?? "medium";
  const ears = look.ears ?? "human";
  const hat = look.hat?.kind ?? "none";
  const hatColor = look.hat?.color ?? "#2b2118";
  const eye = look.eyeColor ?? "#4a2e17";
  const blush = look.blush ?? 0.25;
  const lid = expr === "sleepy" ? 0.55 : expr === "laugh" ? 0.5 : 0.36;
  const s = headR / 0.16; // scale all features with head size

  const curls = useMemo(() => {
    const pts: [number, number, number, number][] = [];
    const n = style === "scraggly" ? 7 : 11;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (i % 2) * 0.3;
      const lift = i % 3 === 0 ? 0.11 : 0.04;
      pts.push([Math.cos(a) * 0.12, lift + (i % 2) * 0.04, Math.sin(a) * 0.11 - 0.03, 0.055 + (i % 3) * 0.012]);
    }
    return pts;
  }, [style]);

  return (
    <group scale={[s, s, s]} position={[0, 0.17, 0]}>
      {/* skull + jaw */}
      <mesh scale={[0.95, 1.08, 1]} castShadow>
        <sphereGeometry args={[0.16, 24, 20]} />
        <Skin color={skin} />
      </mesh>
      <mesh position={[0, -0.085, 0.035]} scale={[1.05, 0.72, 0.95]}>
        <sphereGeometry args={[0.115, 20, 14]} />
        <Skin color={skin} />
      </mesh>
      {/* ears */}
      {[-1, 1].map((side) =>
        ears === "pointed" ? (
          <mesh key={side} position={[side * 0.17, 0.02, -0.02]} rotation={[0, 0, side * -1.25]}>
            <coneGeometry args={[0.04, 0.17, 6]} />
            <Skin color={skin} />
          </mesh>
        ) : (
          <mesh key={side} position={[side * 0.152, -0.01, -0.01]} scale={[0.45, 1, 0.75]}>
            <sphereGeometry args={[0.038, 10, 8]} />
            <Skin color={skin} />
          </mesh>
        )
      )}
      {/* nose */}
      {nose === "long" ? (
        <mesh position={[0, -0.03, 0.2]} rotation={[Math.PI / 2 + 0.25, 0, 0]}>
          <coneGeometry args={[0.03, 0.17, 8]} />
          <Skin color={skin} />
        </mesh>
      ) : (
        <mesh
          position={[0, nose === "big" || nose === "red" ? -0.035 : -0.025, 0.152]}
          scale={nose === "small" ? [0.75, 0.95, 1] : [1, 1, 1.15]}
        >
          <sphereGeometry args={[nose === "big" || nose === "red" ? 0.042 : 0.03, 10, 8]} />
          <Skin color={nose === "red" ? "#c95f4a" : skin} roughness={0.5} />
        </mesh>
      )}
      {/* eyes + brows */}
      {expr !== "sleepy" && (
        <>
          <Eye side={-1} color={eye} lid={lid} />
          <Eye side={1} color={eye} lid={lid} />
        </>
      )}
      {expr === "sleepy" &&
        [-1, 1].map((side) => (
          <mesh key={side} position={[side * 0.058, 0.015, 0.145]} rotation={[0, 0, side * 0.1]}>
            <boxGeometry args={[0.05, 0.008, 0.01]} />
            <meshStandardMaterial color="#5a3a24" />
          </mesh>
        ))}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * 0.06, expr === "laugh" ? 0.075 : 0.065, 0.138]}
          rotation={[0.2, 0, side * (expr === "grin" ? 0.25 : 0.12)]}
        >
          <boxGeometry args={[0.062, 0.013, 0.018]} />
          <Hair color={hairColor === "#000000" ? "#1a120a" : hairColor} />
        </mesh>
      ))}
      {/* cheeks */}
      {blush > 0 &&
        [-1, 1].map((side) => (
          <mesh key={side} position={[side * 0.085, -0.035, 0.115]} scale={[1, 0.65, 0.5]}>
            <sphereGeometry args={[0.045, 10, 8]} />
            <meshStandardMaterial color="#d2785f" transparent opacity={blush} roughness={0.7} depthWrite={false} />
          </mesh>
        ))}
      {/* mouth */}
      {expr === "smile" && (
        <mesh position={[0, -0.075, 0.143]} rotation={[0.15, 0, Math.PI]}>
          <torusGeometry args={[0.034, 0.0075, 6, 14, Math.PI]} />
          <meshStandardMaterial color="#8a3a30" roughness={0.6} />
        </mesh>
      )}
      {expr === "neutral" && (
        <mesh position={[0, -0.08, 0.145]}>
          <boxGeometry args={[0.055, 0.01, 0.01]} />
          <meshStandardMaterial color="#8a3a30" roughness={0.6} />
        </mesh>
      )}
      {(expr === "grin" || expr === "laugh") && (
        <group position={[0, expr === "laugh" ? -0.09 : -0.08, 0.142]}>
          <mesh scale={[1, expr === "laugh" ? 0.75 : 0.45, 0.45]}>
            <sphereGeometry args={[0.042, 12, 8]} />
            <meshStandardMaterial color="#4a1612" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.012, 0.014]}>
            <boxGeometry args={[0.058, 0.012, 0.012]} />
            <meshStandardMaterial color="#efe8d8" roughness={0.4} />
          </mesh>
        </group>
      )}
      {expr === "sleepy" && (
        <mesh position={[0, -0.075, 0.145]} rotation={[0.15, 0, 0]}>
          <torusGeometry args={[0.025, 0.007, 6, 12, Math.PI]} />
          <meshStandardMaterial color="#8a3a30" roughness={0.6} />
        </mesh>
      )}
      {/* facial hair */}
      {(facial === "mustache" || facial === "mustache-stubble") &&
        [-1, 1].map((side) => (
          <mesh key={side} position={[side * 0.032, -0.052, 0.15]} rotation={[0, 0, side * 0.25]} scale={[1, 0.4, 0.5]}>
            <sphereGeometry args={[0.036, 10, 8]} />
            <Hair color={hairColor} />
          </mesh>
        ))}
      {(facial === "stubble" || facial === "mustache-stubble") && (
        <mesh position={[0, -0.09, 0.035]} scale={[1.07, 0.74, 0.97]}>
          <sphereGeometry args={[0.118, 20, 14]} />
          <meshStandardMaterial color="#2a1c10" transparent opacity={0.28} roughness={1} depthWrite={false} />
        </mesh>
      )}
      {facial === "goatee" && (
        <mesh position={[0, -0.145, 0.085]} scale={[0.7, 1, 0.6]}>
          <sphereGeometry args={[0.045, 10, 8]} />
          <Hair color={hairColor} />
        </mesh>
      )}
      {(facial === "beard" || facial === "bigbeard") && (
        <group>
          <mesh position={[0, -0.12, 0.03]} scale={[1.02, 1.0, 0.9]}>
            <sphereGeometry args={[0.135, 16, 12, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.65]} />
            <Hair color={hairColor} />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * 0.045, -0.055, 0.15]} rotation={[0, 0, side * 0.3]} scale={[1.2, 0.45, 0.5]}>
              <sphereGeometry args={[0.04, 10, 8]} />
              <Hair color={hairColor} />
            </mesh>
          ))}
          {facial === "bigbeard" && (
            <>
              <mesh position={[0, -0.27, 0.07]} scale={[0.95, 1.2, 0.75]}>
                <sphereGeometry args={[0.13, 14, 12]} />
                <Hair color={hairColor} />
              </mesh>
              <mesh position={[0, -0.42, 0.12]} scale={[0.7, 1.1, 0.6]}>
                <sphereGeometry args={[0.11, 12, 10]} />
                <Hair color={hairColor} />
              </mesh>
            </>
          )}
        </group>
      )}
      {/* hair */}
      {style !== "bald" && hat !== "coif" && (
        <mesh position={[0, 0.02, -0.015]} scale={[1, 1.05, 1.02]}>
          <sphereGeometry args={[0.165, 20, 14, 0, Math.PI * 2, 0, Math.PI * (style === "long" || style === "bun" ? 0.5 : 0.52)]} />
          <Hair color={hairColor} />
        </mesh>
      )}
      {(style === "curly" || style === "messy" || style === "scraggly") &&
        curls.map(([x, y, z, r], i) => (
          <mesh key={i} position={[x * (style === "messy" ? 1.15 : 1), y + (style === "messy" ? -0.03 : 0), z * (style === "messy" ? 1.15 : 1)]} scale={style === "scraggly" ? [0.7, 1.4, 0.7] : [1, 1, 1]}>
            <sphereGeometry args={[r * (style === "messy" ? 0.8 : 1), 8, 7]} />
            <Hair color={hairColor} />
          </mesh>
        ))}
      {style === "long" && (
        <group>
          <mesh position={[0, -0.15, -0.1]} rotation={[0.12, 0, 0]}>
            <boxGeometry args={[0.27, 0.46, 0.08]} />
            <Hair color={hairColor} />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * 0.16, -0.16, 0.02]} rotation={[0, 0, side * -0.08]}>
              <boxGeometry args={[0.07, 0.42, 0.12]} />
              <Hair color={hairColor} />
            </mesh>
          ))}
        </group>
      )}
      {style === "bun" && (
        <group>
          <mesh position={[0, 0.12, -0.1]}>
            <sphereGeometry args={[0.075, 12, 10]} />
            <Hair color={hairColor} />
          </mesh>
          {/* loose strands at the temples */}
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * 0.14, -0.04, 0.07]} rotation={[0.2, 0, side * 0.25]}>
              <capsuleGeometry args={[0.018, 0.14, 4, 6]} />
              <Hair color={hairColor} />
            </mesh>
          ))}
        </group>
      )}
      {/* hats */}
      {hat === "beret" && (
        <group position={[0, 0.13, 0]}>
          <mesh scale={[1, 0.42, 1]} rotation={[0, 0, 0.12]}>
            <sphereGeometry args={[0.2, 16, 12]} />
            <Cloth color={hatColor} />
          </mesh>
          <mesh position={[0, -0.03, 0]}>
            <cylinderGeometry args={[0.165, 0.165, 0.045, 16]} />
            <Cloth color={hatColor} />
          </mesh>
          {look.hat?.feather && (
            <mesh position={[0.14, 0.1, -0.02]} rotation={[0.2, 0, -0.7]}>
              <coneGeometry args={[0.022, 0.26, 6]} />
              <meshStandardMaterial color={look.hat.feather} roughness={0.8} />
            </mesh>
          )}
        </group>
      )}
      {hat === "beanie" && (
        <group position={[0, 0.04, 0]}>
          <mesh scale={[1, 1.25, 1]}>
            <sphereGeometry args={[0.172, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
            <Cloth color={hatColor} coarse />
          </mesh>
          <mesh position={[0, -0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.165, 0.032, 8, 20]} />
            <Cloth color={hatColor} coarse />
          </mesh>
        </group>
      )}
      {hat === "cap" && (
        <group position={[0, 0.06, 0]}>
          <mesh>
            <sphereGeometry args={[0.17, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
            <Cloth color={hatColor} />
          </mesh>
          <mesh position={[0, -0.005, 0.15]} rotation={[0.25, 0, 0]}>
            <boxGeometry args={[0.2, 0.012, 0.12]} />
            <Leather color={hatColor} />
          </mesh>
        </group>
      )}
      {hat === "coif" && (
        <mesh position={[0, 0.01, -0.01]}>
          <sphereGeometry args={[0.168, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
          <Cloth color="#efe6d2" />
        </mesh>
      )}
      {hat === "bonnet" && (
        <group position={[0, 0.1, -0.02]} rotation={[-0.3, 0, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.13, 0.03, 8, 20]} />
            <Cloth color="#f3ede0" />
          </mesh>
          {/* ribbon bow at the back */}
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * 0.06, 0.02, -0.13]} rotation={[0, 0, side * 0.6]}>
              <boxGeometry args={[0.08, 0.04, 0.012]} />
              <Cloth color="#f3ede0" />
            </mesh>
          ))}
        </group>
      )}
      {/* eyewear */}
      {look.eyewear === "shades" && (
        <group position={[0, 0.025, 0]}>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * 0.062, 0, 0.16]}>
              <boxGeometry args={[0.09, 0.065, 0.025]} />
              <meshStandardMaterial color="#101010" roughness={0.15} metalness={0.3} />
            </mesh>
          ))}
          <mesh position={[0, 0.035, 0.16]}>
            <boxGeometry args={[0.22, 0.018, 0.028]} />
            <meshStandardMaterial color="#0a0a0a" roughness={0.4} />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * 0.135, 0.03, 0.07]} rotation={[0, side * -0.34, 0]}>
              <boxGeometry args={[0.012, 0.014, 0.18]} />
              <meshStandardMaterial color="#0a0a0a" roughness={0.4} />
            </mesh>
          ))}
        </group>
      )}
      {look.eyewear === "roundglasses" && (
        <group position={[0, 0.02, 0.15]}>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * 0.058, 0, 0]}>
              <torusGeometry args={[0.036, 0.004, 6, 16]} />
              <meshStandardMaterial color="#2a1a0c" metalness={0.4} roughness={0.4} />
            </mesh>
          ))}
          <mesh position={[0, 0.004, 0]}>
            <boxGeometry args={[0.045, 0.005, 0.005]} />
            <meshStandardMaterial color="#2a1a0c" metalness={0.4} />
          </mesh>
        </group>
      )}
    </group>
  );
}


function Hand({ side, skin, glove, metal, scale = 1 }: { side: number; skin: string; glove?: string; metal?: boolean; scale?: number }) {
  const Mat = metal ? <Metal /> : glove ? <Leather color={glove} /> : <Skin color={skin} />;
  return (
    <group rotation={[0.25, 0, 0]} scale={[scale, scale, scale]}>
      {/* palm */}
      <mesh scale={[1, 0.45, 1.2]} position={[0, -0.005, 0.012]}>
        <sphereGeometry args={[0.046, 12, 10]} />
        {Mat}
      </mesh>
      {/* four fingers, slightly curled, middle ones longest */}
      {[-0.026, -0.009, 0.009, 0.026].map((x, i) => (
        <mesh key={i} position={[x, -0.014, 0.058]} rotation={[-Math.PI / 2 + 0.5, 0, 0]}>
          <capsuleGeometry args={[0.0095, 0.038 - Math.abs(i - 1.5) * 0.007, 4, 6]} />
          {Mat}
        </mesh>
      ))}
      {/* thumb */}
      <mesh position={[side * 0.044, 0.004, 0.02]} rotation={[-0.9, 0, side * 0.85]}>
        <capsuleGeometry args={[0.011, 0.028, 4, 6]} />
        {Mat}
      </mesh>
    </group>
  );
}

function Arm({
  side,
  look,
  B,
  skin,
  rot,
  elbow,
  armRef,
  foreRef,
  held,
  shoulderX,
}: {
  side: number;
  look: FigureLook;
  B: (typeof BUILDS)[Build];
  skin: string;
  rot: [number, number, number];
  elbow: number;
  armRef?: Pivot;
  foreRef?: Pivot;
  held?: ReactNode;
  shoulderX: number;
}) {
  const o = look.outfit ?? {};
  const kind = o.kind ?? "doublet";
  const sleeves = o.sleeves ?? (kind === "armor" ? "plain" : "puffed");
  const color = o.color ?? "#6b2d2a";
  const accent = o.accent ?? "#c9a24b";
  const sleeveColor = o.sleeveColor ?? "#efe6d2";
  const armor = kind === "armor";
  const bareFore = sleeves === "rolled" || kind === "rags" || kind === "dress";
  const upperColor = kind === "dress" ? sleeveColor : kind === "shirt" ? sleeveColor : color;
  const foreColor = sleeves === "slashed" || sleeves === "puffed" ? sleeveColor : upperColor;
  const stripes = useMemo(() => Array.from({ length: 6 }, (_, k) => (k / 6) * Math.PI * 2), []);
  const upper = limbGeo("ua", B.armLen, B.armR, UPPER_ARM);
  const fore = limbGeo("fa", B.foreLen, B.armR, FOREARM);
  const UpperMat = armor ? <Metal /> : <Cloth color={upperColor} coarse={kind === "rags"} />;
  const ForeMat = armor ? <Metal /> : bareFore ? <Skin color={skin} /> : <Cloth color={foreColor} />;

  return (
    <group ref={armRef} position={[side * shoulderX, 0, 0.02]} rotation={rot}>
      {/* deltoid / pauldron caps the shoulder */}
      {armor ? (
        <mesh position={[side * 0.01, 0.02, 0]} scale={[1, 0.8, 1]}>
          <sphereGeometry args={[B.armR + 0.03, 14, 10]} />
          <Metal />
        </mesh>
      ) : (
        <mesh position={[side * 0.004, 0.014, 0]} scale={[1.05, 1.12, 1]}>
          <sphereGeometry args={[B.armR * 1.18, 14, 10]} />
          {UpperMat}
        </mesh>
      )}
      {/* upper arm: deltoid into biceps, tapering to the elbow */}
      <mesh geometry={upper} castShadow>
        {UpperMat}
      </mesh>
      {/* puffed / slashed sleeve over the upper arm */}
      {(sleeves === "puffed" || sleeves === "slashed") && !armor && kind !== "rags" && (
        <group position={[0, -B.armLen * 0.42, 0]}>
          <mesh scale={[1, 1.55, 1]}>
            <sphereGeometry args={[B.armR * 1.32, 14, 12]} />
            <Cloth color={sleeves === "slashed" ? accent : upperColor} />
          </mesh>
          {sleeves === "slashed" &&
            stripes.map((a, i) => (
              <mesh key={i} position={[Math.sin(a) * B.armR * 1.28, 0, Math.cos(a) * B.armR * 1.28]} rotation={[0, a, 0]}>
                <boxGeometry args={[0.012, B.armR * 1.9, 0.01]} />
                <Cloth color={sleeveColor} />
              </mesh>
            ))}
        </group>
      )}
      {/* elbow */}
      <mesh position={[0, -B.armLen, 0]}>
        <sphereGeometry args={[B.armR * 0.74, 10, 8]} />
        {ForeMat}
      </mesh>
      {/* forearm (pivot at elbow): thick below the elbow, narrow at the wrist */}
      <group ref={foreRef} position={[0, -B.armLen, 0]} rotation={[elbow, 0, 0]}>
        <mesh geometry={fore} castShadow>
          {ForeMat}
        </mesh>
        {/* cuff */}
        {!armor && !bareFore && (
          <mesh position={[0, -B.foreLen + 0.028, 0]}>
            <cylinderGeometry args={[B.armR * 0.6, B.armR * 0.56, 0.045, 12]} />
            <Cloth color={kind === "shirt" ? sleeveColor : accent} />
          </mesh>
        )}
        {sleeves === "rolled" && (
          <mesh position={[0, -0.035, 0]}>
            <cylinderGeometry args={[B.armR * 0.95, B.armR * 0.88, 0.07, 12]} />
            <Cloth color={upperColor} />
          </mesh>
        )}
        {o.wristCuffs && (
          <mesh position={[0, -B.foreLen + 0.035, 0]}>
            <cylinderGeometry args={[B.armR * 0.56, B.armR * 0.52, 0.05, 12]} />
            <Leather color={o.wristCuffs} />
          </mesh>
        )}
        <group position={[0, -B.foreLen - 0.02, 0]}>
          <Hand side={side} skin={skin} glove={look.gloves} metal={armor} scale={Math.min(1.15, Math.max(0.85, B.armR / 0.05))} />
          {held && <group position={[0, -0.02, 0.03]}>{held}</group>}
        </group>
      </group>
    </group>
  );
}

// A boot with its ankle at the origin and its sole ANKLE below it.
function Boot({ color, cuff = false, metal = false, scale = 1 }: { color: string; cuff?: boolean; metal?: boolean; scale?: number }) {
  const Mat = metal ? <Metal /> : <Leather color={color} />;
  return (
    <group position={[0, -ANKLE * scale, -0.03]} scale={[scale, scale, scale]}>
      {/* shaft, wider at the calf */}
      <mesh position={[0, 0.13, 0.01]}>
        <cylinderGeometry args={[0.066, 0.058, 0.24, 12]} />
        {Mat}
      </mesh>
      {cuff && (
        <mesh position={[0, 0.22, 0.01]}>
          <cylinderGeometry args={[0.088, 0.074, 0.07, 12]} />
          <Leather color={color} roughness={0.75} />
        </mesh>
      )}
      {cuff && (
        <mesh position={[0, 0.22, 0.095]}>
          <boxGeometry args={[0.03, 0.025, 0.012]} />
          <Metal color="#c9a24b" roughness={0.35} metalness={0.8} />
        </mesh>
      )}
      {/* ankle + instep */}
      <mesh position={[0, 0.05, 0.05]} scale={[1, 0.8, 1.5]}>
        <sphereGeometry args={[0.058, 12, 10]} />
        {Mat}
      </mesh>
      {/* toe box */}
      <mesh position={[0, 0.035, 0.16]} scale={[1, 0.55, 1.2]}>
        <sphereGeometry args={[0.055, 12, 10]} />
        {Mat}
      </mesh>
      {/* sole + heel */}
      <mesh position={[0, 0.008, 0.085]}>
        <boxGeometry args={[0.11, 0.018, 0.26]} />
        <meshStandardMaterial color="#1a120a" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.02, -0.02]}>
        <boxGeometry args={[0.1, 0.035, 0.07]} />
        <meshStandardMaterial color="#1a120a" roughness={0.9} />
      </mesh>
    </group>
  );
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// One leg: hip → knee → ankle. The rest pose (standing straight, or bent
// to sit with the feet planted) sits on wrapper groups so the animated
// pivots start from zero.
function Leg({ side, pose, look, B, hipY, hipRef, kneeRef, ankleRef }: { side: number; pose: "seated" | "standing"; look: FigureLook; B: (typeof BUILDS)[Build]; hipY: number; hipRef?: Pivot; kneeRef?: Pivot; ankleRef?: Pivot }) {
  const hose = look.legs?.hose ?? "#3a2a1c";
  const boots = look.legs?.boots ?? "#2e1d10";
  const coarse = look.outfit?.kind === "rags";
  const greaves = !!look.legs?.greaves;
  const cuffs = !!look.legs?.bootCuffs;
  const thighLen = THIGH * B.legScale;
  const shinLen = SHIN * B.legScale;
  const r = B.legR;

  let hipRest: [number, number, number] = [0, 0, side * -0.02];
  let kneeRest: [number, number, number] = [0, 0, 0];
  let ankleRest: [number, number, number] = [0, 0, 0];
  if (pose === "seated") {
    const tilt = 0.1; // thigh runs forward, dropping a little toward the knee
    const drop = hipY - Math.sin(tilt) * thighLen - ANKLE * B.legScale;
    const shinFwd = Math.acos(clamp(drop / shinLen, -1, 1)); // feet planted ahead of the knees
    hipRest = [-(Math.PI / 2 - tilt), 0, side * -0.07];
    kneeRest = [Math.PI / 2 - tilt - shinFwd, 0, 0];
    ankleRest = [shinFwd, 0, side * 0.07];
  }

  const HoseMat = <Cloth color={hose} coarse={coarse} />;

  return (
    <group position={[side * HIP_X, 0, 0]} rotation={hipRest}>
      <group ref={hipRef}>
        {/* hip joint */}
        <mesh position={[0, 0.01, 0]}>
          <sphereGeometry args={[r * 0.98, 12, 10]} />
          {HoseMat}
        </mesh>
        {/* thigh: full at the top, tapering into the knee */}
        <mesh geometry={limbGeo("th", thighLen, r, THIGH_SHAPE)} castShadow>
          {HoseMat}
        </mesh>
        <group position={[0, -thighLen, 0]} rotation={kneeRest}>
          <group ref={kneeRef}>
            {/* knee */}
            <mesh>
              <sphereGeometry args={[r * 0.7, 12, 10]} />
              {HoseMat}
            </mesh>
            {/* shin: calf swell under the knee, narrow at the ankle */}
            <mesh geometry={limbGeo("sh", shinLen, r, SHIN_SHAPE)} castShadow>
              {greaves ? <Metal /> : HoseMat}
            </mesh>
            <group position={[0, -shinLen, 0]} rotation={ankleRest}>
              <group ref={ankleRef}>
                <Boot color={boots} cuff={cuffs} metal={greaves} scale={0.9 + B.legScale * 0.1} />
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

// Skirt hanging from the pelvis: stops above the ankle so the boots show
// when she walks, with soft folds and a hem band; the apron is a panel over
// the front of it.
function Skirt({ look, B, hipY, skirtRef }: { look: FigureLook; B: (typeof BUILDS)[Build]; hipY: number; skirtRef?: Pivot }) {
  const skirt = look.legs?.skirt ?? "#4a4038";
  const topR = B.torsoR * 1.12;
  const botR = 0.33;
  const len = hipY - 0.2;
  const slope = Math.atan((botR - topR) / len);
  return (
    <group ref={skirtRef}>
      <group position={[0, 0.02, 0]}>
        <mesh position={[0, -len / 2, 0]} scale={[1.05, 1, 0.9]} castShadow>
          <cylinderGeometry args={[topR, botR, len, 24, 1, true]} />
          <Cloth color={skirt} />
        </mesh>
        {/* soft folds: darker vertical ribs */}
        {[0.5, 1.6, 2.7, 3.8, 4.9].map((a) => (
          <mesh key={a} position={[Math.sin(a) * (botR + topR) * 0.5 * 1.05, -len / 2, Math.cos(a) * (botR + topR) * 0.5 * 0.9]} rotation={[0, a, slope * (a > Math.PI ? 1 : -1)]}>
            <boxGeometry args={[0.04, len * 0.95, 0.025]} />
            <Cloth color={skirt} />
          </mesh>
        ))}
        {/* hem band */}
        <mesh position={[0, -len + 0.03, 0]} scale={[1.05, 1, 0.9]}>
          <cylinderGeometry args={[botR - 0.004, botR + 0.012, 0.06, 24, 1, true]} />
          <Cloth color={look.outfit?.accent ?? "#c9a24b"} />
        </mesh>
        {/* apron: a panel that follows the front of the skirt */}
        {look.outfit?.apron && (
          <mesh position={[0, -(len - 0.06) / 2 + 0.1, 0]} scale={[1.05, 1, 0.9]}>
            <cylinderGeometry args={[topR + 0.02, botR * 0.9 + 0.02, len + 0.04, 14, 1, true, -0.95, 1.9]} />
            <Cloth color={look.outfit.apron} />
          </mesh>
        )}
      </group>
    </group>
  );
}

export function Stool({ seatY = 0.4, r = 0.24 }: { seatY?: number; r?: number }) {
  return (
    <group>
      <mesh position={[0, seatY - 0.03, 0]} receiveShadow>
        <cylinderGeometry args={[r, r * 0.92, 0.06, 14]} />
        <Wood base="#5a3a1c" dark="#1f1206" planks={3} />
      </mesh>
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2 + 0.5;
        return (
          <mesh key={i} position={[Math.cos(a) * r * 0.62, (seatY - 0.06) / 2, Math.sin(a) * r * 0.62]} rotation={[Math.sin(a) * 0.16, 0, -Math.cos(a) * 0.16]}>
            <cylinderGeometry args={[0.028, 0.035, seatY - 0.06, 8]} />
            <Wood base="#4a2e14" dark="#1f1206" planks={1} />
          </mesh>
        );
      })}
      <mesh position={[0, seatY * 0.42, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[r * 0.52, 0.014, 6, 16]} />
        <meshStandardMaterial color="#3a2512" roughness={0.9} />
      </mesh>
    </group>
  );
}

// Turned torso: a lathe profile from the hips out over the seat, in to the
// waist, out over the ribcage and chest to the armpit line, then the slope
// of the trapezius into the neck. Squashed front-to-back so the
// cross-section is a human ellipse rather than a tube.
function Torso({ B, torsoBase, shoulderY, female, children }: { B: (typeof BUILDS)[Build]; torsoBase: number; shoulderY: number; female?: boolean; children: ReactNode }) {
  const geo = useMemo(() => {
    const r = B.torsoR;
    const L = (shoulderY - torsoBase) / 0.86;
    const b = B.belly;
    const w = female ? 0.84 : 1;
    const key = `torso|${r}|${L.toFixed(3)}|${b}|${w}`;
    return lathe(
      key,
      [
        [r * 0.72, 0],
        [r * 1.1, L * 0.07],
        [r * 1.08, L * 0.2],
        [r * (0.9 + b * 0.45) * w, L * 0.38],
        [r * (0.97 + b * 0.4) * (female ? 0.94 : 1), L * 0.52],
        [r * (1.06 + b * 0.1), L * 0.68],
        [r * 1.12, L * 0.82],
        [r * 1.08, L * 0.9],
        [r * 0.8, L * 0.97],
        [0.072, L * 1.03],
      ],
      28
    );
  }, [B, torsoBase, shoulderY, female]);
  return (
    <mesh geometry={geo} position={[0, torsoBase, 0]} scale={[1.2, 1, 0.78 + B.belly * 0.22]} castShadow>
      {children}
    </mesh>
  );
}

export default function Figure({ look, pose, refs, armPose, highlight, highlightColor, heldLeft, heldRight, stool, children }: Props) {
  const B = BUILDS[look.build ?? "stout"];
  const skin = look.skin ?? DEFAULT_SKIN;
  const o = look.outfit ?? {};
  const kind = o.kind ?? "doublet";
  const color = o.color ?? "#6b2d2a";
  const accent = o.accent ?? "#c9a24b";
  const sleeveColor = o.sleeveColor ?? "#efe6d2";
  const collar = o.collar ?? (kind === "armor" ? "none" : kind === "shirt" || kind === "rags" || kind === "dress" ? "flat" : "ruff");
  const armor = kind === "armor";
  const hipY = pose === "seated" ? 0.42 : (THIGH + SHIN + ANKLE) * B.legScale;
  const torsoBase = 0.02;
  const chestY = torsoBase + B.torsoLen / 2 + B.torsoR * 0.6;
  const shoulderY = torsoBase + B.torsoLen + B.torsoR * 0.95;
  const neckTop = shoulderY + B.neck + B.torsoR * 0.3;
  const SW = Math.max(B.shoulderW, B.torsoR * 1.3); // arm pivots sit on the turned shoulders
  const FZ = B.torsoR * 0.82; // front face of the torso
  const glow = highlight ? { emissive: highlightColor ?? "#e7c66a", emissiveIntensity: 0.3 } : {};
  const bodyColor = kind === "shirt" ? sleeveColor : kind === "dress" ? sleeveColor : color;
  const buttons = useMemo(() => Array.from({ length: 5 }, (_, i) => i), []);

  const leftRot = armPose?.left ?? [-0.55, 0, 0.1];
  const rightRot = armPose?.right ?? [-0.55, 0, -0.1];

  return (
    <group>
      {stool && pose === "seated" && <Stool />}
      <group position={[0, hipY, 0]}>
        <group ref={refs?.pelvis}>
          {/* pelvis / seat of the trousers, the legs hang from it */}
          <mesh position={[0, torsoBase - 0.03, -0.005]} scale={[1.22, 0.72, 0.86]}>
            <sphereGeometry args={[B.torsoR * 1.08, 16, 12]} />
            <Cloth color={look.legs?.skirt ?? look.legs?.hose ?? "#3a2a1c"} coarse={kind === "rags"} />
          </mesh>
          <Leg side={-1} pose={pose} look={look} B={B} hipY={hipY} hipRef={refs?.leftLeg} kneeRef={refs?.leftShin} ankleRef={refs?.leftFoot} />
          <Leg side={1} pose={pose} look={look} B={B} hipY={hipY} hipRef={refs?.rightLeg} kneeRef={refs?.rightShin} ankleRef={refs?.rightFoot} />
          {look.legs?.skirt && <Skirt look={look} B={B} hipY={hipY} skirtRef={refs?.skirt} />}

          <group rotation={[B.hunch, 0, 0]}>
            <group ref={refs?.torso}>
              {kind === "doublet" && (
                <mesh position={[0, torsoBase + 0.05, 0]} scale={[1.2, 1, 0.8]}>
                  <cylinderGeometry args={[B.torsoR * 1.02, B.torsoR * 1.3, 0.14, 16, 1, true]} />
                  <Cloth color={color} {...glow} />
                </mesh>
              )}
              {/* torso */}
              <Torso B={B} torsoBase={torsoBase} shoulderY={shoulderY}>
                {armor ? <Metal /> : <Cloth color={bodyColor} coarse={kind === "rags"} {...glow} />}
              </Torso>
              {/* belly, hanging forward over the belt */}
              {B.belly > 0 && (
                <mesh position={[0, chestY - 0.1, B.torsoR * 0.35]} scale={[1.15, 0.85, 0.95]}>
                  <sphereGeometry args={[B.torsoR * 1.0, 18, 14]} />
                  <Cloth color={bodyColor} {...glow} />
                </mesh>
              )}
              {/* vest over a shirt: open front panels + back, hugging the torso */}
              {o.vest && (
                <group position={[0, chestY + 0.01, 0]} scale={[1.25, 1, 0.84 + B.belly * 0.2]}>
                  {[-1, 1].map((side) => (
                    <mesh key={side}>
                      <cylinderGeometry args={[B.torsoR * 1.1, B.torsoR * 1.04, B.torsoLen + B.torsoR * 1.3, 10, 1, true, side > 0 ? 0.3 : -1.55, 1.25]} />
                      <Leather color={o.vest ?? "#6b4423"} />
                    </mesh>
                  ))}
                  <mesh>
                    <cylinderGeometry args={[B.torsoR * 1.1, B.torsoR * 1.04, B.torsoLen + B.torsoR * 1.3, 14, 1, true, Math.PI - 1.35, 2.7]} />
                    <Leather color={o.vest ?? "#6b4423"} />
                  </mesh>
                </group>
              )}
              {/* placket + buttons */}
              {kind === "doublet" && (
                <group position={[0, chestY, FZ + 0.004]}>
                  <mesh>
                    <boxGeometry args={[0.03, B.torsoLen + B.torsoR * 1.1, 0.01]} />
                    <Cloth color={accent} />
                  </mesh>
                  {buttons.map((i) => (
                    <mesh key={i} position={[0, (i - 2) * ((B.torsoLen + B.torsoR) / 5), 0.008]}>
                      <sphereGeometry args={[0.012, 8, 6]} />
                      <Metal color="#d9b25a" roughness={0.3} metalness={0.8} />
                    </mesh>
                  ))}
                </group>
              )}
              {/* surcoat + cross for armour */}
              {armor && (
                <group position={[0, chestY - 0.02, FZ + 0.01]}>
                  <mesh>
                    <boxGeometry args={[B.torsoR * 1.3, B.torsoLen + B.torsoR * 1.4, 0.025]} />
                    <Cloth color={color} {...glow} />
                  </mesh>
                  <mesh position={[0, 0.02, 0.016]}>
                    <boxGeometry args={[0.04, 0.26, 0.01]} />
                    <Cloth color={accent} />
                  </mesh>
                  <mesh position={[0, 0.06, 0.016]}>
                    <boxGeometry args={[0.17, 0.04, 0.01]} />
                    <Cloth color={accent} />
                  </mesh>
                  {/* chainmail skirt */}
                  <mesh position={[0, -(B.torsoLen / 2 + B.torsoR * 0.9), -FZ - 0.01]} scale={[1.2, 1, 0.8]}>
                    <cylinderGeometry args={[B.torsoR * 1.05, B.torsoR * 1.25, 0.16, 16, 1, true]} />
                    <Metal color="#8c8f96" roughness={0.6} metalness={0.6} />
                  </mesh>
                </group>
              )}
              {/* cloak draped from the shoulders down the back */}
              {o.cloak && (
                <group position={[0, chestY + B.torsoLen / 2 + B.torsoR * 0.2, -0.02]}>
                  <mesh position={[0, -(B.torsoLen + B.torsoR * 2.4) / 2, -0.03]} rotation={[0, Math.PI, 0]}>
                    <cylinderGeometry args={[B.shoulderW + 0.05, B.shoulderW + 0.12, B.torsoLen + B.torsoR * 2.2, 16, 1, true, -1.1, 2.2]} />
                    <Cloth color={o.cloak} />
                  </mesh>
                  {/* clasp cord across the chest */}
                  <mesh position={[0, 0.02, B.torsoR * 0.95]} rotation={[0, 0, 0]}>
                    <boxGeometry args={[B.shoulderW * 1.6, 0.02, 0.015]} />
                    <Metal color="#c9a24b" roughness={0.35} metalness={0.8} />
                  </mesh>
                </group>
              )}
              {/* leather harness: crossed straps over the chest, buckled */}
              {o.harness &&
                [-1, 1].map((side) => (
                  <group key={side} position={[side * B.torsoR * 0.42, chestY + 0.02, FZ * (B.belly > 0 ? 1.28 : 1.08)]} rotation={[0.1, 0, side * -0.18]}>
                    <mesh>
                      <boxGeometry args={[0.055, B.torsoLen + B.torsoR * 1.5, 0.014]} />
                      <Leather color={o.harness ?? "#4a2e16"} />
                    </mesh>
                    <mesh position={[0, B.torsoR * 0.3, 0.01]}>
                      <boxGeometry args={[0.05, 0.04, 0.012]} />
                      <Metal color="#c9a24b" roughness={0.35} metalness={0.8} />
                    </mesh>
                    {[0.35, -0.25].map((f) => (
                      <mesh key={f} position={[0, f * (B.torsoLen + B.torsoR * 1.5), 0.01]}>
                        <sphereGeometry args={[0.009, 6, 6]} />
                        <Metal color="#c9a24b" roughness={0.35} metalness={0.8} />
                      </mesh>
                    ))}
                  </group>
                ))}
              {/* baldric: one strap from the right shoulder to the left hip */}
              {o.baldric && (
                <group position={[0, chestY, FZ * (B.belly > 0 ? 1.25 : 1.08)]} rotation={[0.08, 0, 0.55]}>
                  <mesh>
                    <boxGeometry args={[0.048, B.torsoLen + B.torsoR * 2.3, 0.014]} />
                    <Leather color={o.baldric} />
                  </mesh>
                  <mesh position={[0, 0.05, 0.01]}>
                    <boxGeometry args={[0.045, 0.04, 0.012]} />
                    <Metal color="#c9a24b" roughness={0.35} metalness={0.8} />
                  </mesh>
                </group>
              )}
              {/* necklaces */}
              {o.necklace === "chain" && (
                <group position={[0, shoulderY + B.torsoR * 0.12, 0.02]}>
                  <mesh rotation={[Math.PI / 2 + 0.35, 0, 0]} scale={[1, 1, 0.7]}>
                    <torusGeometry args={[0.1, 0.009, 6, 24]} />
                    <Metal color="#c9a24b" roughness={0.35} metalness={0.85} />
                  </mesh>
                  <mesh position={[0, -0.1, FZ * 1.1]}>
                    <cylinderGeometry args={[0.028, 0.028, 0.008, 12]} />
                    <Metal color="#d9b25a" roughness={0.3} metalness={0.85} />
                  </mesh>
                </group>
              )}
              {o.necklace === "beads" &&
                [0, 1, 2].map((k) => (
                  <mesh key={k} position={[0, shoulderY + B.torsoR * 0.1 - k * 0.03, 0.02 + k * 0.01]} rotation={[Math.PI / 2 + 0.3, 0, 0]} scale={[1, 1, 0.7]}>
                    <torusGeometry args={[0.085 + k * 0.025, 0.006, 6, 20]} />
                    <meshStandardMaterial color={["#c9a24b", "#4a3a2a", "#3f6b4a"][k]} roughness={0.5} metalness={k === 0 ? 0.8 : 0.1} />
                  </mesh>
                ))}
              {/* undershirt showing at the throat */}
              {o.undershirt && (
                <mesh position={[0, chestY + B.torsoLen * 0.35, FZ + 0.004]} rotation={[0.1, 0, 0]}>
                  <cylinderGeometry args={[0.001, 0.09, 0.22, 3, 1, false, Math.PI * 0.5, Math.PI]} />
                  <Cloth color={o.undershirt} />
                </mesh>
              )}
              {/* bar towel tucked into the belt */}
              {o.towel && (
                <group position={[-B.torsoR * 0.95, torsoBase - 0.06, B.torsoR * 0.35]} rotation={[0.1, 0.3, 0.1]}>
                  <mesh>
                    <boxGeometry args={[0.1, 0.24, 0.02]} />
                    <Cloth color={typeof o.towel === "string" ? o.towel : "#efe6d2"} />
                  </mesh>
                  {typeof o.towel !== "string" && (
                    <mesh position={[0, -0.07, 0.011]}>
                      <boxGeometry args={[0.1, 0.02, 0.004]} />
                      <Cloth color="#8a2a2a" />
                    </mesh>
                  )}
                </group>
              )}
              {/* hip pouch without a belt */}
              {o.pouch && (
                <mesh position={[B.torsoR * 0.9, torsoBase, B.torsoR * 0.45]} scale={[1, 1.2, 0.7]}>
                  <sphereGeometry args={[0.055, 10, 8]} />
                  <Leather color={o.pouch} />
                </mesh>
              )}
              {/* suspenders */}
              {o.suspenders &&
                [-1, 1].map((side) => (
                  <mesh key={side} position={[side * B.torsoR * 0.45, chestY + 0.02, FZ * 1.02]} rotation={[0.08, 0, side * 0.1]}>
                    <boxGeometry args={[0.045, B.torsoLen + B.torsoR * 1.3, 0.012]} />
                    <Leather color={o.suspenders ?? '#4a2e16'} />
                  </mesh>
                ))}
              {/* corset laced over the bodice */}
              {o.corset && (
                <group position={[0, chestY - B.torsoR * 0.35, 0]}>
                  <mesh scale={[1.22, 1, 0.84]}>
                    <cylinderGeometry args={[B.torsoR * 1.0, B.torsoR * 1.1, B.torsoLen + B.torsoR * 0.6, 16]} />
                    <Leather color={o.corset} />
                  </mesh>
                  {[0, 1, 2, 3].map((i) => (
                    <mesh key={i} position={[0, (i - 1.5) * 0.06, FZ * 1.12]} rotation={[0, 0, i % 2 ? 0.8 : -0.8]}>
                      <boxGeometry args={[0.1, 0.008, 0.01]} />
                      <Cloth color="#efe6d2" />
                    </mesh>
                  ))}
                </group>
              )}
              {/* bust under the chemise, only on the dress silhouette */}
              {kind === "dress" &&
                [-1, 1].map((side) => (
                  <mesh key={side} position={[side * 0.085, chestY + 0.08, FZ * 0.85]}>
                    <sphereGeometry args={[0.095, 14, 12]} />
                    <Cloth color={sleeveColor} />
                  </mesh>
                ))}
              {/* apron (a skirted figure gets its apron from the skirt instead) */}
              {o.apron && !look.legs?.skirt && (
                <group>
                  <mesh position={[0, chestY - B.torsoR * 0.2 - 0.08, FZ + 0.03]} rotation={[0.1, 0, 0]}>
                    <boxGeometry args={[B.torsoR * 1.8, B.torsoLen + B.torsoR * 1.6, 0.02]} />
                    <Cloth color={o.apron} />
                  </mesh>
                  {/* bib */}
                  {kind !== "dress" && (
                    <mesh position={[0, chestY + B.torsoR * 0.55, FZ + 0.025]}>
                      <boxGeometry args={[B.torsoR * 1.1, B.torsoR * 0.9, 0.02]} />
                      <Cloth color={o.apron} />
                    </mesh>
                  )}
                  {/* apron falls over the lap */}
                  {!look.legs?.skirt && (
                  <mesh
                    position={[0, pose === "seated" ? torsoBase - 0.02 : torsoBase - 0.4, pose === "seated" ? FZ + 0.2 : FZ + 0.1]}
                    rotation={[pose === "seated" ? -1.35 : 0.12, 0, 0]}
             
                  >
                    <boxGeometry args={[B.torsoR * 1.7, pose === "seated" ? 0.36 : 0.75, 0.02]} />
                    <Cloth color={o.apron} />
                  </mesh>
                  )}
                </group>
              )}
              {/* belt + buckle */}
              {(o.belt ?? (kind === "doublet" || kind === "armor" || kind === "shirt" || kind === "tunic")) && (
                <group position={[0, torsoBase + 0.1, 0]}>
                  <mesh scale={[1.22, 1, 0.84 + B.belly * 0.2]}>
                    <cylinderGeometry args={[B.torsoR * 1.06, B.torsoR * 1.08, 0.055, 18]} />
                    <Leather color="#2e1b0d" />
                  </mesh>
                  <mesh position={[0, 0, FZ * 1.3]}>
                    <boxGeometry args={[0.055, 0.045, 0.02]} />
                    <Metal color="#c9a24b" roughness={0.35} metalness={0.8} />
                  </mesh>
                  {/* pouch on the hip */}
                  {!armor && (
                    <mesh position={[B.torsoR * 0.85, -0.06, B.torsoR * 0.5]} scale={[1, 1.2, 0.7]}>
                      <sphereGeometry args={[0.05, 10, 8]} />
                      <Leather color="#4a2e16" />
                    </mesh>
                  )}
                </group>
              )}
              {/* rag patches */}
              {kind === "rags" && (
                <group>
                  <mesh position={[0.07, chestY + 0.04, FZ + 0.005]} rotation={[0, 0, 0.4]}>
                    <boxGeometry args={[0.09, 0.07, 0.02]} />
                    <Cloth color={accent} coarse />
                  </mesh>
                  <mesh position={[-0.1, chestY - 0.06, FZ]} rotation={[0, 0, -0.3]}>
                    <boxGeometry args={[0.07, 0.09, 0.02]} />
                    <Cloth color={accent} coarse />
                  </mesh>
                  {[-0.12, -0.04, 0.05, 0.13].map((x, i) => (
                    <mesh key={i} position={[x, torsoBase - 0.08, FZ * 0.95 + (i % 2) * 0.04]} rotation={[0.15, 0, (i - 1.5) * 0.2]}>
                      <boxGeometry args={[0.05, 0.14, 0.015]} />
                      <Cloth color={i % 2 ? color : accent} coarse />
                    </mesh>
                  ))}
                </group>
              )}

              {/* neck */}
              <mesh position={[0, shoulderY + B.neck / 2 + B.torsoR * 0.15, 0]}>
                <cylinderGeometry args={[0.058, 0.074, B.neck + B.torsoR * 0.35, 12]} />
                <Skin color={skin} />
              </mesh>
              {/* collars */}
              {collar === "ruff" && (
                <mesh position={[0, shoulderY + B.torsoR * 0.32, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.55]}>
                  <torusGeometry args={[0.095, 0.045, 8, 24]} />
                  <Cloth color="#f3ede0" />
                </mesh>
              )}
              {collar === "turtleneck" && (
                <mesh position={[0, shoulderY + B.torsoR * 0.35, 0]}>
                  <cylinderGeometry args={[0.085, 0.1, 0.11, 14]} />
                  <Cloth color={color} />
                </mesh>
              )}
              {collar === "flat" &&
                [-1, 1].map((side) => (
                  <mesh key={side} position={[side * 0.08, shoulderY + B.torsoR * 0.25, 0.1]} rotation={[0.5, 0, side * 0.35]}>
                    <boxGeometry args={[0.11, 0.016, 0.11]} />
                    <Cloth color={sleeveColor} />
                  </mesh>
                ))}
              {collar === "hood" && (
                <mesh position={[0, shoulderY + B.torsoR * 0.3, -0.05]} rotation={[Math.PI / 2 - 0.3, 0, 0]} scale={[1.1, 1, 0.7]}>
                  <torusGeometry args={[0.13, 0.065, 10, 20]} />
                  <Cloth color={color} />
                </mesh>
              )}

              {/* arms (shoulder pivots) */}
              <group position={[0, shoulderY, 0]}>
                <Arm side={-1} look={look} B={B} skin={skin} rot={leftRot} elbow={armPose?.leftElbow ?? -1.15} armRef={refs?.leftArm} foreRef={refs?.leftForearm} held={heldLeft} shoulderX={SW} />
                <Arm side={1} look={look} B={B} skin={skin} rot={rightRot} elbow={armPose?.rightElbow ?? -1.15} armRef={refs?.rightArm} foreRef={refs?.rightForearm} held={heldRight} shoulderX={SW} />
              </group>

              {/* head (pivot at the top of the neck). The face yaw and the
                  build's hunch sit outside the animated pivot so a head bob
                  still nods toward wherever the face is looking. */}
              <group rotation={[0, look.face?.yaw ?? 0, 0]}>
                <group position={[0, neckTop, 0]} rotation={[-B.hunch * 0.85, 0, 0]}>
                  <group ref={refs?.head}>
                    {look.face ? (
                      <PhotoHead url={look.face.url} back={look.face.back ?? look.hair?.color ?? skin} height={look.face.height} headR={B.headR} tolerance={look.face.keyTolerance} longHair={look.hair?.style === "long" ? look.hair.color ?? "#3a2616" : undefined} />
                    ) : (
                      <ProceduralHead look={look} headR={B.headR} skin={skin} />
                    )}
                  </group>
                </group>
              </group>
              {children}
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

// Where the hips, shoulders and head end up in root space for a given build
// and pose. Used by callers that want to hang tooltips or props.
export function figureMetrics(build: Build = "stout", pose: "seated" | "standing" = "seated") {
  const B = BUILDS[build];
  const hipY = pose === "seated" ? 0.42 : (THIGH + SHIN + ANKLE) * B.legScale;
  const shoulderY = 0.02 + B.torsoLen + B.torsoR * 0.95;
  const neckTop = shoulderY + B.neck + B.torsoR * 0.3;
  return { hipY, shoulderY: hipY + shoulderY, headY: hipY + neckTop + B.headR, top: hipY + neckTop + B.headR * 2.4, hunch: B.hunch };
}

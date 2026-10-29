import type { FigureRefs, Pivot } from "./Figure";

// ANIMATION
// Full-body poses for the Figure kit, written straight into its joints
// every frame. Each function takes the figure's refs and a clock and sets
// every joint it owns, so callers can layer their own tweaks after the
// call (a head turn, an arm that holds a tankard).
//
// Conventions (figure faces +Z):
//   rotation.x negative swings a limb forward; positive, back.
//   rotation.z: for the LEFT limb negative is outward, for the RIGHT
//   positive is outward (so `side * angle` with side = -1 / +1).
//   foot.x negative lifts the toes, positive points them.

const pos = (v: number) => (v > 0 ? v : 0);
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (e0: number, e1: number, x: number) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
const rot = (p: Pivot | undefined, x: number, y: number, z: number) => {
  const o = p?.current;
  if (o) o.rotation.set(x, y, z);
};
const move = (p: Pivot | undefined, x: number, y: number, z: number) => {
  const o = p?.current;
  if (o) o.position.set(x, y, z);
};

// ---------------------------------------------------------------------------
// WALK
// The classic cycle: contact (heel strike), recoil, passing, high point.
// `phase` advances 2π per full stride (one step with each foot); the left
// foot strikes the ground at π/2, the right at 3π/2. Drive the phase from
// distance travelled, not time, so the feet never slide.

export type WalkOptions = {
  stride?: number; // hip swing amplitude, radians
  swing?: number; // arm swing amplitude, radians
  lean?: number; // forward lean of the spine
  bob?: number; // vertical bob of the hips
  leftArm?: boolean; // let the walk drive this arm (default true)
  rightArm?: boolean;
};

// step length in metres for a given stride amplitude and leg length, so a
// mover can turn distance into phase: phase += (distance / stepLength) * π
export const stepLength = (stride = 0.32, leg = 0.88) => 2 * leg * Math.sin(stride);

function walkLeg(hip: Pivot | undefined, knee: Pivot | undefined, foot: Pivot | undefined, side: number, p: number, stride: number) {
  const thigh = -stride * Math.sin(p);
  // the knee folds hardest just after toe-off to clear the floor, and
  // gives a little as the weight lands on it after heel strike
  const k = 0.08 + 1.05 * Math.pow(pos(Math.cos(p + 0.35)), 1.4) + 0.18 * Math.pow(pos(Math.sin(p - 0.5)), 3);
  // heel leads into the strike, toes push off, flat underfoot in between
  const f = -(thigh + k) * 0.75 - 0.2 * Math.sin(p);
  rot(hip, thigh, 0, side * -0.02);
  rot(knee, k, 0, 0);
  rot(foot, f, 0, 0);
}

export function poseWalk(r: FigureRefs, phase: number, o: WalkOptions = {}) {
  const stride = o.stride ?? 0.32;
  const swing = o.swing ?? 0.3;
  const lean = o.lean ?? 0.05;
  const bob = o.bob ?? 0.025;
  const s = Math.sin(phase);
  const c = Math.cos(phase);
  const c2 = Math.cos(phase * 2);

  walkLeg(r.leftLeg, r.leftShin, r.leftFoot, -1, phase, stride);
  walkLeg(r.rightLeg, r.rightShin, r.rightFoot, 1, phase + Math.PI, stride);

  // hips: highest at the passing position, lowest at each heel strike;
  // weight shifts over the planted foot; the free hip drops and swings
  // forward with its leg
  move(r.pelvis, 0.015 * c, -0.012 + bob * c2, 0);
  rot(r.pelvis, 0, 0.1 * s, 0.05 * c);
  // shoulders counter-rotate against the hips, with a slight forward lean
  rot(r.torso, lean + 0.015 * c2, -0.17 * s, -0.04 * c);
  // arms swing opposite the legs, elbows bending as they come forward
  if (o.leftArm ?? true) {
    rot(r.leftArm, swing * s, 0, -0.12);
    rot(r.leftForearm, -0.3 - 0.45 * pos(-s), 0, 0);
  }
  if (o.rightArm ?? true) {
    rot(r.rightArm, -swing * s, 0, 0.12);
    rot(r.rightForearm, -0.3 - 0.45 * pos(s), 0, 0);
  }
  // head stays level and looks where it is going
  rot(r.head, -lean * 0.7 - 0.02 * c2, 0.07 * s, 0.02 * c);
  // skirt swings a touch behind the stride
  rot(r.skirt, 0.02, 0, 0.04 * s);
}

// ---------------------------------------------------------------------------
// DANCE
// A samba-style groove: weight rocks side to side every beat with a bounce
// in the knees, hips swing, shoulders twist against them, the free foot
// taps out to the side, arms pump at chest height and now and then go up
// over the head. `drunk` adds a slow drift and over-reach to all of it.

export type DanceOptions = { bpm?: number; energy?: number; drunk?: number };

export function poseDance(r: FigureRefs, t: number, o: DanceOptions = {}) {
  const bpm = o.bpm ?? 100;
  const e = o.energy ?? 1;
  const d = o.drunk ?? 0.5;
  const th = (t * bpm) / 60 * Math.PI; // π per beat: one full sway every two beats
  const s = Math.sin(th);
  const c = Math.cos(th);
  const bounce = s * s; // down between the beats, up on them
  const c2 = Math.cos(th * 2);
  // drunken drift: slow, irregular lean that the groove rides on top of
  const w1 = Math.sin(t * 0.7) * 0.6 + Math.sin(t * 1.3 + 1) * 0.4;
  const w2 = Math.sin(t * 0.55 + 2) * 0.6 + Math.sin(t * 1.1) * 0.4;
  // every so often both hands go up
  const up = Math.pow(pos(Math.sin(t * 0.21 + 0.5)), 4);

  move(r.pelvis, 0.07 * s * e, -0.04 * bounce * e, 0);
  rot(r.pelvis, 0.03 * c, 0.25 * c * e, 0.14 * s * e + 0.06 * w1 * d);
  rot(r.torso, 0.08 + 0.05 * c2 * e + 0.12 * w2 * d, -0.4 * c * e, -0.12 * s * e + 0.18 * w1 * d);

  // the foot on the unweighted side taps out and the knees give on the beat
  for (const side of [-1, 1] as const) {
    const w = smooth(0.05, 1, -side * s); // left (-1) free when the hips shift right (+x)
    const hip = side < 0 ? r.leftLeg : r.rightLeg;
    const knee = side < 0 ? r.leftShin : r.rightShin;
    const foot = side < 0 ? r.leftFoot : r.rightFoot;
    const lift = -0.32 * w * e;
    const bend = 0.85 * w * e + 0.3 * bounce * e + 0.08;
    rot(hip, lift, 0, side * (0.06 + 0.3 * w * e));
    rot(knee, bend, 0, 0);
    rot(foot, 0.3 * w * e - (lift + bend) * 0.35 * (1 - w), 0, side * 0.1 * w);
  }

  // arms pump alternately at chest height; when `up` rises they go over
  // the head, elbows loosening
  const lx = -0.6 - 0.6 * s * e;
  const rx = -0.6 + 0.6 * s * e;
  rot(r.leftArm, lx * (1 - up) - 0.3 * up, 0.2 * up, -(0.35 + 0.25 * e) - 2.1 * up);
  rot(r.rightArm, rx * (1 - up) - 0.3 * up, -0.2 * up, 0.35 + 0.25 * e + 2.1 * up);
  rot(r.leftForearm, -1.45 - 0.35 * s * e + 0.55 * up, 0, -0.2 * up);
  rot(r.rightForearm, -1.45 + 0.35 * s * e + 0.55 * up, 0, 0.2 * up);

  rot(r.head, 0.12 * c2 * e + 0.1 * w2 * d - 0.25 * up, 0.35 * c * e + 0.2 * w1 * d, 0.12 * s * e);
  rot(r.skirt, 0, 0, 0.08 * s * e);
}

// ---------------------------------------------------------------------------
// STAGGER
// Far too much ale, still upright, just. A slow irregular sway about the
// ankles in every direction, knees soft, arms out for balance, head
// lolling; every so often the lean gets away from him and he has to throw
// a foot out sideways to catch himself, then takes a swig to steady the
// nerves.

export type StaggerOptions = { seed?: number; tankard?: "left" | "right" | null };

export function poseStagger(r: FigureRefs, t: number, o: StaggerOptions = {}) {
  const p = o.seed ?? 0;
  const tank = o.tankard === undefined ? "right" : o.tankard;
  // sway: sideways (a), fore and aft (b), twist (y) — sums of unrelated
  // frequencies so it never settles into a rhythm
  const a = Math.sin(t * 0.9 + p) * 0.55 + Math.sin(t * 1.7 + p * 2.1) * 0.25 + Math.sin(t * 0.37 + p) * 0.3;
  const b = Math.sin(t * 0.73 + p + 1) * 0.55 + Math.sin(t * 1.31 + p) * 0.35;
  const y = Math.sin(t * 0.5 + p + 2) * 0.5 + Math.sin(t * 1.9 + p) * 0.2;
  // the lurch: a sharp lean to one side and a saving step out under it
  const lurch = Math.pow(pos(Math.sin(t * 0.41 + p)), 10);
  const toLeft = Math.sin(t * 0.13 + p) > 0;
  const ls = toLeft ? -1 : 1;
  // hiccup: a quick little hop of the whole body
  const hic = Math.pow(pos(Math.sin(t * 2.9 + p)), 40) * Math.pow(pos(Math.sin(t * 0.27 + p + 1)), 2);
  const swig = Math.pow(pos(Math.sin(t * 0.3 + p + 3)), 5);

  move(r.pelvis, 0.08 * a + 0.12 * lurch * ls, -0.02 - 0.03 * Math.abs(b) - 0.07 * lurch + 0.025 * hic, 0.03 * b);
  rot(r.pelvis, 0.05 * b, 0.1 * y, -0.1 * a - 0.1 * lurch * ls);
  rot(r.torso, 0.12 + 0.2 * b + 0.15 * lurch, 0.25 * y, 0.28 * a + 0.32 * lurch * ls);

  for (const side of [-1, 1] as const) {
    const hip = side < 0 ? r.leftLeg : r.rightLeg;
    const knee = side < 0 ? r.leftShin : r.rightShin;
    const foot = side < 0 ? r.leftFoot : r.rightFoot;
    // the leg under the lean steps out to take the weight
    const lean = smooth(0.15, 0.8, side * a);
    const catchStep = side === ls ? lurch : 0;
    const hx = -0.1 * b - 0.35 * catchStep;
    const k = 0.2 + 0.15 * pos(b) + 0.2 * lean + 0.65 * catchStep + 0.2 * (side === ls ? 0 : lurch);
    rot(hip, hx, 0, side * (0.14 + 0.25 * lean + 0.35 * catchStep));
    rot(knee, k, 0, 0);
    rot(foot, -(hx + k) * 0.6, 0, side * -0.05);
  }

  // arms out for balance, the one away from the lean reaching furthest
  const armL = 0.55 + 0.35 * a + 0.5 * lurch;
  const armR = 0.55 - 0.35 * a + 0.5 * lurch;
  rot(r.leftArm, -0.3 - 0.2 * b, 0, -armL);
  rot(r.rightArm, -0.3 - 0.2 * b, 0, armR);
  rot(r.leftForearm, -0.45 - 0.3 * Math.abs(a), 0, -0.2);
  rot(r.rightForearm, -0.45 - 0.3 * Math.abs(a), 0, 0.2);
  // the tankard hand keeps the cup up, and brings it to the mouth for a swig
  if (tank === "right") {
    rot(r.rightArm, -0.9 - 0.9 * swig, 0.15 * swig, 0.35 + 0.1 * a);
    rot(r.rightForearm, -1.35 - 0.9 * swig, 0, 0.25);
  } else if (tank === "left") {
    rot(r.leftArm, -0.9 - 0.9 * swig, -0.15 * swig, -(0.35 - 0.1 * a));
    rot(r.leftForearm, -1.35 - 0.9 * swig, 0, -0.25);
  }

  rot(r.head, 0.22 + 0.2 * b - 0.5 * lurch - 0.4 * swig, 0.4 * y, 0.35 * a + 0.2 * lurch * ls);
}

// ---------------------------------------------------------------------------
// IDLE
// Standing still: breathing, a little weight shift, arms relaxed.

export function poseIdle(r: FigureRefs, t: number, seed = 0) {
  const br = Math.sin(t * 1.3 + seed);
  const shift = Math.sin(t * 0.23 + seed);
  move(r.pelvis, 0.02 * shift, -0.005 + 0.004 * br, 0);
  rot(r.pelvis, 0, 0.03 * shift, -0.03 * shift);
  rot(r.torso, 0.03 + 0.01 * br, -0.03 * shift, 0.02 * shift);
  for (const side of [-1, 1] as const) {
    const w = smooth(0, 1, -side * shift); // the unweighted knee relaxes
    rot(side < 0 ? r.leftLeg : r.rightLeg, -0.03 * w, 0, side * 0.04);
    rot(side < 0 ? r.leftShin : r.rightShin, 0.06 + 0.1 * w, 0, 0);
    rot(side < 0 ? r.leftFoot : r.rightFoot, -(0.03 + 0.1 * w) * 0.6, 0, 0);
  }
  rot(r.head, 0.02 * br, 0.1 * Math.sin(t * 0.4 + seed), 0.02 * shift);
  rot(r.skirt, 0, 0, 0);
}

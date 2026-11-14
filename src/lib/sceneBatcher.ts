import {
  BufferAttribute,
  BufferGeometry,
  DataTexture,
  FloatType,
  Group,
  Matrix3,
  Matrix4,
  Mesh,
  Object3D,
  RGBAFormat,
  RedIntegerFormat,
  UnsignedIntType,
  type Camera,
  type Color,
  type InterleavedBufferAttribute,
  type Material,
  type Scene,
} from "three";

// SCENE BATCHER
// The tavern is assembled from about 1,600 small meshes (every button, boot
// and bottle is its own primitive), and three.js pays a fixed CPU price per
// mesh per frame: a material bind, a handful of matrix uploads, a draw call.
// That price, not the triangle count, is what the frame time was made of.
//
// This draws the same triangles in far fewer calls without changing the
// scene graph that React owns:
//
//   - Every mesh is filed under its nearest MOVING ancestor (a joint, a
//     flame, a walking figure) or under the room itself if nothing above
//     it moves. Meshes that share that ancestor and the same kind of
//     material are baked into one piece of geometry in the ancestor's
//     space.
//   - All the pieces that share a material are drawn together in a single
//     call (the renderer's "batched mesh" path: one multi-draw, with each
//     piece looking up its ancestor's matrix in a small texture). Every
//     batch reads the same matrix texture, so however many things move,
//     one texture is uploaded per frame.
//   - Materials that differ only in colour share a batch: the colour is
//     written into the vertices instead (same multiply, same result).
//   - The original meshes stay exactly where React put them, parked on a
//     layer the camera does not draw, so pointer events still hit-test
//     against the real, animated objects.
//
// Nothing has to be declared. A node counts as moving once its transform
// is seen to change; a material or geometry that is rewritten in place is
// noticed and re-baked (or, if it keeps changing, left out and drawn the
// old way); anything mounted, unmounted, shown or hidden is picked up
// before the frame it first appears in. Whatever cannot be batched
// faithfully (transparent surfaces, instanced meshes, sprites, mirrored
// or sheared joints) is simply left alone and renders as before.
//
// To keep one mesh out of it: userData={{ noBatch: true }}.

/** Source meshes that a batch draws are moved here; the camera stays on layer 0. */
export const HIDDEN_LAYER = 31;
const HIDDEN_MASK = (1 << HIDDEN_LAYER) | 0;
const DEFAULT_MASK = 1;

type Rec = {
  obj: Object3D;
  stamp: number;
  /** 0: in the scene at the first build. 1: mounted later (bottles, notes). */
  gen: 0 | 1;
  /** Its transform has been seen to change, so batches hang from it. */
  dynamic: boolean;
  /** A moving node whose world matrix a batch cannot carry (mirror, shear). */
  blocked: boolean;
  px: number; py: number; pz: number;
  qx: number; qy: number; qz: number; qw: number;
  sx: number; sy: number; sz: number;
  visible: boolean;
  kids: number;
  mask: number;
  // meshes only
  isMesh: boolean;
  geometry: BufferGeometry | null;
  material: Material | Material[] | null;
  cast: boolean;
  receive: boolean;
  posVersion: number;
  /** Geometry rewritten in place: draw it the old way. */
  live: boolean;
  /** Parked on HIDDEN_LAYER because a batch draws it. */
  parked: boolean;
  rel: Matrix4 | null;
  group: BatchGroup | null;
};

type MatInfo = {
  material: Material;
  key: string | null;
  sum: number;
  lastChange: number;
  streak: number;
  live: boolean;
  stamp: number;
};

type Baked = { P: Float32Array; N: Float32Array; U: Float32Array; C: Float32Array; I: Uint32Array; v: number; n: number };

type BatchGroup = {
  pivot: Object3D;
  recs: Rec[];
  h1: number;
  h2: number;
  bakedH1: number;
  bakedH2: number;
  /** Where this group lives in its batch's buffers (vCap 0: not written yet). */
  vStart: number;
  vCap: number;
  iStart: number;
  iCap: number;
  iCount: number;
  shown: boolean;
  stamp: number;
};

type Family = {
  key: string;
  gen: 0 | 1;
  material: Material;
  cast: boolean;
  receive: boolean;
  batch: Batch | null;
  groups: Map<Object3D, BatchGroup>;
  wasted: number;
};

// One draw call for every group that shares a material. To the renderer
// this is a BatchedMesh (it reads exactly the fields declared here), but
// it keeps none of BatchedMesh's per-frame bookkeeping: the draw list only
// changes when the scene does, and the matrices live in one texture shared
// by every batch.
class Batch extends Mesh {
  readonly isBatchedMesh = true;
  _multiDrawStarts = new Int32Array(8);
  _multiDrawCounts = new Int32Array(8);
  _multiDrawCount = 0;
  _matricesTexture: DataTexture;
  _indirectTexture: DataTexture;
  readonly _colorsTexture = null;
  readonly colorTexture = null;
  vCap: number;
  iCap: number;
  vUsed = 0;
  iUsed = 0;
  private bytes: number;

  constructor(material: Material, matrices: DataTexture, vCap: number, iCap: number) {
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(new Float32Array(vCap * 3), 3));
    geometry.setAttribute("normal", new BufferAttribute(new Float32Array(vCap * 3), 3));
    geometry.setAttribute("uv", new BufferAttribute(new Float32Array(vCap * 2), 2));
    geometry.setAttribute("color", new BufferAttribute(new Float32Array(vCap * 3), 3));
    const index = vCap > 65535 ? new Uint32Array(iCap) : new Uint16Array(iCap);
    geometry.setIndex(new BufferAttribute(index, 1));
    super(geometry, material);
    this.vCap = vCap;
    this.iCap = iCap;
    this.bytes = index.BYTES_PER_ELEMENT;
    this._matricesTexture = matrices;
    this._indirectTexture = indirectTexture(8);
    this.name = "batch";
    // its pieces move independently, so there is no one sphere to cull by
    this.frustumCulled = false;
    this.matrixAutoUpdate = false;
  }

  // pointer events go to the real meshes, never to the batch
  raycast() {}

  /** Copy a baked group into its slot. `fresh`: the buffers are new, no need to flag ranges. */
  write(g: BatchGroup, b: Baked, fresh: boolean) {
    const a = this.geometry.attributes;
    const put = (name: string, src: Float32Array, size: number) => {
      const attr = a[name] as BufferAttribute;
      (attr.array as Float32Array).set(src, g.vStart * size);
      if (!fresh) {
        attr.addUpdateRange(g.vStart * size, b.v * size);
        attr.needsUpdate = true;
      }
    };
    put("position", b.P, 3);
    put("normal", b.N, 3);
    put("uv", b.U, 2);
    put("color", b.C, 3);
    const index = this.geometry.index as BufferAttribute;
    const ia = index.array;
    const I = b.I;
    for (let k = 0; k < b.n; k++) ia[g.iStart + k] = g.vStart + I[k];
    if (!fresh) {
      index.addUpdateRange(g.iStart, b.n);
      index.needsUpdate = true;
    }
    g.iCount = b.n;
  }

  /** The draw list: one entry per visible group, each pointing at its pivot's matrix. */
  setDraws(groups: BatchGroup[], slotOf: (pivot: Object3D) => number) {
    let n = 0;
    for (const g of groups) if (g.shown && g.iCount > 0) n++;
    if (n > this._multiDrawStarts.length) {
      const cap = Math.max(n, this._multiDrawStarts.length * 2);
      this._multiDrawStarts = new Int32Array(cap);
      this._multiDrawCounts = new Int32Array(cap);
    }
    let ids = this._indirectTexture.image.data as Uint32Array;
    if (n > ids.length) {
      this._indirectTexture.dispose();
      this._indirectTexture = indirectTexture(n * 2);
      ids = this._indirectTexture.image.data as Uint32Array;
    }
    let k = 0;
    for (const g of groups) {
      if (!g.shown || g.iCount === 0) continue;
      this._multiDrawStarts[k] = g.iStart * this.bytes;
      this._multiDrawCounts[k] = g.iCount;
      ids[k] = slotOf(g.pivot);
      k++;
    }
    this._multiDrawCount = n;
    this._indirectTexture.needsUpdate = true;
  }

  dispose() {
    this.geometry.dispose();
    this._indirectTexture.dispose();
  }
}

function indirectTexture(entries: number) {
  const size = Math.max(2, Math.ceil(Math.sqrt(entries)));
  return new DataTexture(new Uint32Array(size * size), size, size, RedIntegerFormat, UnsignedIntType);
}

// One matrix = four RGBA float texels; the width stays a multiple of four
// so a matrix never wraps onto the next row.
function matrixTexture(slots: number) {
  let size = Math.ceil(Math.sqrt(slots * 4) / 4) * 4;
  size = Math.max(size, 16);
  const data = new Float32Array(size * size * 4);
  // slot 0 is the identity: everything that never moves uses it
  data[0] = data[5] = data[10] = data[15] = 1;
  const tex = new DataTexture(data, size, size, RGBAFormat, FloatType);
  tex.needsUpdate = true;
  return tex;
}

const _normal = new Matrix3();
const _m = new Matrix4();
const _inv = new Matrix4();
const f64 = new Float64Array(1);
const u32 = new Uint32Array(f64.buffer);

// Two independent 32-bit hashes over doubles: a group is re-baked only
// when what it would contain has actually changed.
function mix1(h: number, v: number) {
  f64[0] = v;
  h = Math.imul(h ^ u32[0], 0x01000193);
  return Math.imul(h ^ u32[1], 0x01000193);
}
function mix2(h: number, v: number) {
  f64[0] = v;
  h = (Math.imul(h, 31) + u32[0]) | 0;
  return (Math.imul(h, 31) + u32[1]) | 0;
}

type AnyMaterial = Material & {
  color?: Color;
  emissive?: Color;
  emissiveIntensity?: number;
  roughness?: number;
  metalness?: number;
  bumpScale?: number;
  map?: { id: number } | null;
  bumpMap?: { id: number } | null;
  emissiveMap?: { id: number } | null;
  wireframe?: boolean;
};

// Cheap fingerprint of the properties React (or animation code) is likely
// to rewrite in place, polled every frame.
function checksum(m: AnyMaterial) {
  let s = m.version * 0.5 + m.opacity * 3 + m.side * 5 + (m.transparent ? 7 : 0) + (m.visible ? 11 : 0) + m.alphaTest * 13;
  const c = m.color;
  if (c) s += c.r * 17 + c.g * 19 + c.b * 23;
  const e = m.emissive;
  if (e) s += e.r * 29 + e.g * 31 + e.b * 37 + (m.emissiveIntensity ?? 0) * 41;
  if (m.roughness !== undefined) s += m.roughness * 43 + (m.metalness ?? 0) * 47;
  if (m.map) s += m.map.id * 53;
  if (m.bumpMap) s += m.bumpMap.id * 59 + (m.bumpScale ?? 0) * 61;
  if (m.emissiveMap) s += m.emissiveMap.id * 67;
  return s;
}

const SKIP = new Set(["uuid", "name", "version", "userData", "color", "_listeners"]);

// Everything about a material except its colour, as a string. Two
// materials with the same key render identically once the colour is moved
// into the vertices. null: this material is not batched at all.
function materialKey(m: AnyMaterial): string | null {
  if (m.type !== "MeshStandardMaterial" && m.type !== "MeshBasicMaterial") return null;
  if (m.transparent || !m.visible || m.vertexColors || m.wireframe || m.clippingPlanes) return null;
  if (!m.color || m.blending !== 1) return null;
  if (Object.prototype.hasOwnProperty.call(m, "onBeforeCompile") || Object.prototype.hasOwnProperty.call(m, "customProgramCacheKey")) return null;
  const parts: string[] = [];
  const bag = m as unknown as Record<string, unknown>;
  for (const k in bag) {
    // "__r3f" and friends: bookkeeping hung on the object, not material state
    if (SKIP.has(k) || k.startsWith("__")) continue;
    const v = bag[k] as
      | null
      | undefined
      | number
      | string
      | boolean
      | { isTexture?: boolean; isColor?: boolean; isVector2?: boolean; isEuler?: boolean; id?: number; r?: number; g?: number; b?: number; x?: number; y?: number; z?: number };
    if (v === null || v === undefined) parts.push(`${k}:~`);
    else if (typeof v === "function") return null;
    else if (typeof v !== "object") parts.push(`${k}:${String(v)}`);
    else if (v.isTexture) parts.push(`${k}:T${v.id}`);
    else if (v.isColor) parts.push(`${k}:${v.r},${v.g},${v.b}`);
    else if (v.isVector2) parts.push(`${k}:${v.x},${v.y}`);
    else if (v.isEuler) parts.push(`${k}:${v.x},${v.y},${v.z}`);
    else {
      try {
        parts.push(`${k}:${JSON.stringify(v)}`);
      } catch {
        return null;
      }
    }
  }
  return parts.join("|");
}

const geometryOk = new WeakMap<BufferGeometry, boolean>();
function canBake(g: BufferGeometry) {
  let ok = geometryOk.get(g);
  if (ok === undefined) {
    const a = g.attributes;
    ok =
      !!a.position &&
      a.position.itemSize === 3 &&
      (!a.normal || a.normal.itemSize === 3) &&
      (!a.uv || a.uv.itemSize === 2) &&
      !a.tangent &&
      Object.keys(g.morphAttributes).length === 0 &&
      g.drawRange.start === 0 &&
      g.drawRange.count === Infinity;
    geometryOk.set(g, ok);
  }
  return ok;
}

type Attr = BufferAttribute | InterleavedBufferAttribute;
const plain = (a: Attr | undefined): a is BufferAttribute =>
  !!a && !(a as InterleavedBufferAttribute).isInterleavedBufferAttribute && !a.normalized;

// Bumped whenever the vertex data is rewritten in place.
function positionVersion(g: BufferGeometry | null | undefined) {
  const a = g?.attributes.position as (Attr & { version?: number; data?: { version: number } }) | undefined;
  if (!a) return -1;
  return a.version ?? a.data?.version ?? 0;
}

const defaultBeforeRender = Object3D.prototype.onBeforeRender;

export class SceneBatcher {
  readonly scene: Scene;
  private holder = new Group();
  private recs = new Map<Object3D, Rec>();
  private list: Rec[] = [];
  private mats = new WeakMap<Material, MatInfo>();
  private matList: MatInfo[] = [];
  private families = new Map<string, Family>();
  private familyMaterials = new Map<string, Material>();
  /** Matrix slot per moving pivot; slot 0 is the identity, for the room itself. */
  private slots = new Map<Object3D, number>();
  private freeSlots: number[] = [];
  private nextSlot = 1;
  private matrices = matrixTexture(256);
  private rels: Matrix4[] = [];
  private stamp = 0;
  private frame = 0;
  private built = false;
  private dirty = true;
  private prevBeforeRender: Scene["onBeforeRender"] | null = null;

  constructor(scene: Scene) {
    this.scene = scene;
    this.holder.name = "scene-batches";
    this.holder.matrixAutoUpdate = false;
    this.holder.userData.batchHolder = true;
  }

  /** Start watching. Call once the scene is mounted and before anything has animated. */
  attach() {
    this.scene.add(this.holder);
    // rest pose of everything, so the first frame of animation shows what moves
    this.scene.traverse((o) => {
      if (o !== this.holder) this.rec(o);
    });
    this.list = [...this.recs.values()];
    this.prevBeforeRender = this.scene.onBeforeRender;
    // inside render(): world matrices are fresh and every animation hook has run
    this.scene.onBeforeRender = (...args: Parameters<Scene["onBeforeRender"]>) => {
      this.prevBeforeRender?.apply(this.scene, args);
      this.sync();
    };
  }

  dispose() {
    if (this.prevBeforeRender) this.scene.onBeforeRender = this.prevBeforeRender;
    for (const r of this.list) this.unpark(r);
    for (const f of this.families.values()) f.batch?.dispose();
    for (const m of this.familyMaterials.values()) m.dispose();
    this.matrices.dispose();
    this.families.clear();
    this.familyMaterials.clear();
    this.slots.clear();
    this.freeSlots = [];
    this.nextSlot = 1;
    this.recs.clear();
    this.list = [];
    this.matList = [];
    this.built = false;
    this.dirty = true;
    this.scene.remove(this.holder);
  }

  /** What will actually be drawn, for compiling shaders ahead of the first frame. */
  renderables(camera: Camera): Object3D {
    const out = new Object3D();
    const walk = (o: Object3D) => {
      if (!o.visible) return;
      const r = o as Mesh & { isPoints?: boolean; isLine?: boolean; isSprite?: boolean };
      if ((r.isMesh || r.isPoints || r.isLine || r.isSprite) && o.layers.test(camera.layers)) out.children.push(o);
      for (const c of o.children) walk(c);
    };
    walk(this.scene);
    return out;
  }

  stats() {
    let groups = 0;
    let batches = 0;
    let parked = 0;
    let dynamic = 0;
    let live = 0;
    for (const f of this.families.values()) {
      if (f.batch) batches++;
      groups += f.groups.size;
    }
    for (const r of this.list) {
      if (r.parked) parked++;
      if (r.dynamic) dynamic++;
      if (r.live) live++;
    }
    return { nodes: this.list.length, batches, groups, parked, dynamic, live, pivots: this.slots.size, rebuilds: this.stamp };
  }

  /** Bring the batches up to date with the scene. Cheap when nothing changed. */
  sync() {
    this.frame++;
    this.poll();
    if (this.dirty) this.rebuild();
    if (this.place()) {
      // a joint turned out to be mirrored or sheared: draw its meshes the old way
      this.rebuild();
      this.place();
    }
  }

  private rec(o: Object3D): Rec {
    let r = this.recs.get(o);
    if (r) return r;
    const m = o as Mesh;
    const isMesh = m.isMesh === true;
    const p = o.position;
    const q = o.quaternion;
    const s = o.scale;
    r = {
      obj: o,
      stamp: 0,
      gen: this.built ? 1 : 0,
      dynamic: false,
      blocked: false,
      px: p.x, py: p.y, pz: p.z,
      qx: q.x, qy: q.y, qz: q.z, qw: q.w,
      sx: s.x, sy: s.y, sz: s.z,
      visible: o.visible,
      kids: o.children.length,
      mask: o.layers.mask,
      isMesh,
      geometry: isMesh ? m.geometry : null,
      material: isMesh ? m.material : null,
      cast: o.castShadow,
      receive: o.receiveShadow,
      posVersion: isMesh ? positionVersion(m.geometry) : -1,
      live: false,
      parked: false,
      rel: null,
      group: null,
    };
    this.recs.set(o, r);
    return r;
  }

  private matInfo(m: Material): MatInfo {
    let info = this.mats.get(m);
    if (!info) {
      info = { material: m, key: materialKey(m as AnyMaterial), sum: checksum(m as AnyMaterial), lastChange: -9, streak: 0, live: false, stamp: 0 };
      this.mats.set(m, info);
    }
    return info;
  }

  // What changed since the last frame? Only cheap comparisons here; the
  // work happens in rebuild() and only when something did.
  private poll() {
    let dirty = this.dirty;
    const scene = this.scene;
    const list = this.list;
    for (let i = 0; i < list.length; i++) {
      const r = list[i];
      const o = r.obj;
      if (o.parent === null && o !== scene) {
        dirty = true;
        continue;
      }
      if (!r.dynamic) {
        const p = o.position;
        const q = o.quaternion;
        const s = o.scale;
        if (
          p.x !== r.px || p.y !== r.py || p.z !== r.pz ||
          q.x !== r.qx || q.y !== r.qy || q.z !== r.qz || q.w !== r.qw ||
          s.x !== r.sx || s.y !== r.sy || s.z !== r.sz
        ) {
          r.dynamic = o !== scene;
          r.px = p.x; r.py = p.y; r.pz = p.z;
          r.qx = q.x; r.qy = q.y; r.qz = q.z; r.qw = q.w;
          r.sx = s.x; r.sy = s.y; r.sz = s.z;
          dirty = true;
        }
      }
      if (o.visible !== r.visible) {
        r.visible = o.visible;
        dirty = true;
      }
      if (o.children.length !== r.kids) {
        r.kids = o.children.length;
        dirty = true;
      }
      const mask = o.layers.mask;
      if (mask !== (r.parked ? HIDDEN_MASK : r.mask)) {
        // somebody else moved it between layers: respect that
        r.mask = mask;
        r.parked = false;
        dirty = true;
      }
      if (r.isMesh) {
        const m = o as Mesh;
        if (m.geometry !== r.geometry || m.material !== r.material || o.castShadow !== r.cast || o.receiveShadow !== r.receive) {
          r.geometry = m.geometry;
          r.material = m.material;
          r.cast = o.castShadow;
          r.receive = o.receiveShadow;
          r.posVersion = positionVersion(m.geometry);
          dirty = true;
        } else {
          const v = positionVersion(m.geometry);
          if (v !== r.posVersion) {
            r.posVersion = v;
            r.live = true;
            dirty = true;
          }
        }
      }
    }
    const mats = this.matList;
    for (let i = 0; i < mats.length; i++) {
      const info = mats[i];
      if (info.live) continue;
      const sum = checksum(info.material as AnyMaterial);
      if (sum !== info.sum) {
        info.sum = sum;
        const was = info.key;
        info.key = materialKey(info.material as AnyMaterial);
        // not batched before and still not (a spark fading out): nothing to redo
        if (was === null && info.key === null) continue;
        // a prop change re-bakes; something animated every frame is left out
        info.streak = this.frame - info.lastChange === 1 ? info.streak + 1 : 1;
        info.lastChange = this.frame;
        if (info.streak >= 3) info.live = true;
        dirty = true;
      }
    }
    this.dirty = dirty;
  }

  private familyOf(r: Rec): Family | null {
    const material = r.material;
    const geometry = r.geometry;
    if (!material || !geometry || Array.isArray(material)) return null;
    const o = r.obj as Mesh & { isInstancedMesh?: boolean; isSkinnedMesh?: boolean; isBatchedMesh?: boolean };
    if (o.isInstancedMesh || o.isSkinnedMesh || o.isBatchedMesh) return null;
    if (r.live || r.mask !== DEFAULT_MASK || o.renderOrder !== 0 || o.userData.noBatch) return null;
    if (o.customDepthMaterial || o.customDistanceMaterial || o.onBeforeRender !== defaultBeforeRender) return null;
    if (!canBake(geometry)) return null;
    const info = this.matInfo(material);
    if (info.stamp !== this.stamp) {
      info.stamp = this.stamp;
      this.matList.push(info);
    }
    if (info.live || info.key === null) return null;
    const key = `${info.key}#${o.castShadow ? "c" : "-"}${o.receiveShadow ? "r" : "-"}${r.gen}`;
    let f = this.families.get(key);
    if (!f) {
      // a material is tied to one receiveShadow setting by the renderer,
      // so batches that differ there must not share one
      const mk = info.key + (o.receiveShadow ? "#r" : "#-");
      let fm = this.familyMaterials.get(mk);
      if (!fm) {
        // same material, colour moved to the vertices
        const clone = material.clone() as AnyMaterial;
        clone.color!.setRGB(1, 1, 1);
        clone.vertexColors = true;
        clone.name = "batched";
        fm = clone;
        this.familyMaterials.set(mk, fm);
      }
      f = { key, gen: r.gen, material: fm, cast: o.castShadow, receive: o.receiveShadow, batch: null, groups: new Map(), wasted: 0 };
      this.families.set(key, f);
    }
    return f;
  }

  private rel(depth: number) {
    let m = this.rels[depth];
    if (!m) m = this.rels[depth] = new Matrix4();
    return m;
  }

  private walk(o: Object3D, pivot: Object3D, visible: boolean, blocked: boolean, depth: number) {
    if (o === this.holder) return;
    const r = this.rec(o);
    r.stamp = this.stamp;
    r.kids = o.children.length;
    this.list.push(r);
    const rel = this.rel(depth);
    if (depth === 0) rel.identity();
    else if (r.dynamic) {
      pivot = o;
      blocked = r.blocked;
      rel.identity();
    } else rel.multiplyMatrices(this.rel(depth - 1), o.matrix);
    visible = visible && o.visible;

    r.group = null;
    if (r.isMesh && visible && !blocked) {
      const f = this.familyOf(r);
      if (f) {
        let g = f.groups.get(pivot);
        if (!g) {
          g = { pivot, recs: [], h1: 0, h2: 0, bakedH1: 0, bakedH2: 0, vStart: 0, vCap: 0, iStart: 0, iCap: 0, iCount: 0, shown: false, stamp: 0 };
          f.groups.set(pivot, g);
        }
        if (g.stamp !== this.stamp) {
          g.stamp = this.stamp;
          g.recs.length = 0;
          g.h1 = 0x811c9dc5 | 0;
          g.h2 = 7;
        }
        if (!r.rel) r.rel = new Matrix4();
        r.rel.copy(rel);
        const e = rel.elements;
        const c = (r.material as AnyMaterial).color!;
        let h1 = g.h1;
        let h2 = g.h2;
        for (let i = 0; i < 16; i++) {
          h1 = mix1(h1, e[i]);
          h2 = mix2(h2, e[i]);
        }
        const gid = r.geometry!.id;
        h1 = mix1(mix1(mix1(mix1(mix1(h1, gid), r.posVersion), c.r), c.g), c.b);
        h2 = mix2(mix2(mix2(mix2(mix2(h2, gid), r.posVersion), c.r), c.g), c.b);
        g.h1 = h1;
        g.h2 = h2;
        g.recs.push(r);
        r.group = g;
      }
    }
    const kids = o.children;
    for (let i = 0; i < kids.length; i++) this.walk(kids[i], pivot, visible, blocked, depth + 1);
  }

  private rebuild() {
    this.dirty = false;
    this.stamp++;
    this.list = [];
    this.matList = [];
    this.walk(this.scene, this.scene, true, false, 0);

    // forget whatever left the scene
    if (this.list.length !== this.recs.size) {
      for (const [o, r] of this.recs) {
        if (r.stamp !== this.stamp) {
          this.unpark(r);
          this.recs.delete(o);
          const slot = this.slots.get(o);
          if (slot !== undefined) {
            this.slots.delete(o);
            this.freeSlots.push(slot);
          }
        }
      }
    }

    for (const f of [...this.families.values()]) this.updateFamily(f);

    // batched meshes step off the camera's layer; the rest step back on
    for (const r of this.list) {
      if (!r.isMesh) continue;
      if (r.group && r.group.shown) {
        if (!r.parked) {
          r.parked = true;
          r.obj.layers.mask = HIDDEN_MASK;
        }
      } else this.unpark(r);
    }
    this.built = true;
  }

  private unpark(r: Rec) {
    if (r.parked) {
      r.parked = false;
      r.obj.layers.mask = r.mask;
    }
  }

  private slotOf = (pivot: Object3D): number => {
    if (pivot === this.scene) return 0;
    let slot = this.slots.get(pivot);
    if (slot === undefined) {
      slot = this.freeSlots.pop() ?? this.nextSlot++;
      this.slots.set(pivot, slot);
      const data = this.matrices.image.data as Float32Array;
      if ((slot + 1) * 16 > data.length) {
        // out of room: a bigger texture, handed to every batch
        const bigger = matrixTexture(slot * 2);
        (bigger.image.data as Float32Array).set(data);
        this.matrices.dispose();
        this.matrices = bigger;
        for (const f of this.families.values()) if (f.batch) f.batch._matricesTexture = bigger;
      }
    }
    return slot;
  };

  private updateFamily(f: Family) {
    const stamp = this.stamp;
    let live = 0;
    let draws = false;

    for (const [pivot, g] of f.groups) {
      if (g.stamp === stamp && g.recs.length > 0) {
        live++;
        continue;
      }
      g.recs.length = 0;
      if (g.shown) draws = true;
      g.shown = false;
      g.bakedH1 = g.bakedH2 = 0;
      const gone = pivot !== this.scene && this.recs.get(pivot)?.stamp !== stamp;
      if (gone) {
        // its pivot left the scene: the space is dead until the batch is rebuilt
        f.wasted += g.vCap;
        f.groups.delete(pivot);
      }
      // otherwise it is only empty for now (a hover moved its meshes to a
      // glowing material): it keeps its place for when they come back
    }

    if (live === 0) {
      if (f.batch) {
        this.holder.remove(f.batch);
        f.batch.dispose();
      }
      this.families.delete(f.key);
      return;
    }

    const batch = f.batch;
    const baked = new Map<BatchGroup, Baked>();
    // start over if there is no batch yet, or half of it is dead space
    let full = batch === null || f.wasted > batch.vCap * 0.5;

    if (batch && !full) {
      for (const g of f.groups.values()) {
        if (g.recs.length === 0) continue;
        if (g.vCap > 0 && g.h1 === g.bakedH1 && g.h2 === g.bakedH2) {
          if (!g.shown) {
            g.shown = true;
            draws = true;
          }
          continue;
        }
        const b = this.bake(g);
        baked.set(g, b);
        if (g.vCap > 0) {
          // rewrite in place if it still fits where it was
          if (b.v > g.vCap || b.n > g.iCap) {
            full = true;
            break;
          }
        } else {
          // a new group goes on the end
          if (batch.vUsed + b.v > batch.vCap || batch.iUsed + b.n > batch.iCap) {
            full = true;
            break;
          }
          g.vStart = batch.vUsed;
          g.iStart = batch.iUsed;
          g.vCap = b.v;
          g.iCap = b.n;
          batch.vUsed += b.v;
          batch.iUsed += b.n;
        }
        batch.write(g, b, false);
        g.shown = true;
        g.bakedH1 = g.h1;
        g.bakedH2 = g.h2;
        draws = true;
      }
    }

    if (!full) {
      if (draws) batch!.setDraws([...f.groups.values()], this.slotOf);
      return;
    }

    // a fresh batch, packed, with room to grow
    const groups: BatchGroup[] = [];
    let verts = 0;
    let indices = 0;
    for (const [pivot, g] of f.groups) {
      if (g.recs.length === 0) {
        f.groups.delete(pivot);
        continue;
      }
      const b = baked.get(g) ?? this.bake(g);
      baked.set(g, b);
      verts += b.v;
      indices += b.n;
      groups.push(g);
    }
    if (f.batch) {
      this.holder.remove(f.batch);
      f.batch.dispose();
    }
    // things mounted on the fly (bottles, notes) come and go: leave more slack
    const slack = f.gen === 1 ? 1 : 0.15;
    const next = new Batch(f.material, this.matrices, Math.ceil(verts * (1 + slack)) + 64, Math.ceil(indices * (1 + slack)) + 96);
    next.castShadow = f.cast;
    next.receiveShadow = f.receive;
    for (const g of groups) {
      const b = baked.get(g)!;
      g.vStart = next.vUsed;
      g.iStart = next.iUsed;
      g.vCap = b.v;
      g.iCap = b.n;
      next.vUsed += b.v;
      next.iUsed += b.n;
      next.write(g, b, true);
      g.shown = true;
      g.bakedH1 = g.h1;
      g.bakedH2 = g.h2;
    }
    next.setDraws(groups, this.slotOf);
    f.batch = next;
    f.wasted = 0;
    this.holder.add(next);
  }

  // One piece of geometry for a group, in its pivot's space, with each
  // mesh's material colour written into the vertices.
  private bake(g: BatchGroup): Baked {
    let vCount = 0;
    let iCount = 0;
    for (const r of g.recs) {
      const geo = r.geometry!;
      const n = geo.attributes.position.count;
      vCount += n;
      iCount += geo.index ? geo.index.count : n;
    }
    const P = new Float32Array(vCount * 3);
    const N = new Float32Array(vCount * 3);
    const U = new Float32Array(vCount * 2);
    const C = new Float32Array(vCount * 3);
    const I = new Uint32Array(iCount);
    let vo = 0;
    let io = 0;
    for (const r of g.recs) {
      const geo = r.geometry!;
      const rel = r.rel!;
      const e = rel.elements;
      const pos = geo.attributes.position as Attr;
      const nrm = geo.attributes.normal as Attr | undefined;
      const uv = geo.attributes.uv as Attr | undefined;
      const n = pos.count;
      const ne = _normal.getNormalMatrix(rel).elements;
      const col = (r.material as AnyMaterial).color!;
      const cr = col.r;
      const cg = col.g;
      const cb = col.b;
      const pa = plain(pos) ? pos.array : null;
      const na = plain(nrm) ? nrm.array : null;
      const ua = plain(uv) ? uv.array : null;
      for (let i = 0; i < n; i++) {
        const i3 = i * 3;
        const o3 = (vo + i) * 3;
        const x = pa ? pa[i3] : pos.getX(i);
        const y = pa ? pa[i3 + 1] : pos.getY(i);
        const z = pa ? pa[i3 + 2] : pos.getZ(i);
        P[o3] = e[0] * x + e[4] * y + e[8] * z + e[12];
        P[o3 + 1] = e[1] * x + e[5] * y + e[9] * z + e[13];
        P[o3 + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
        if (nrm) {
          const nx = na ? na[i3] : nrm.getX(i);
          const ny = na ? na[i3 + 1] : nrm.getY(i);
          const nz = na ? na[i3 + 2] : nrm.getZ(i);
          let tx = ne[0] * nx + ne[3] * ny + ne[6] * nz;
          let ty = ne[1] * nx + ne[4] * ny + ne[7] * nz;
          let tz = ne[2] * nx + ne[5] * ny + ne[8] * nz;
          const len = Math.sqrt(tx * tx + ty * ty + tz * tz);
          if (len > 0) {
            tx /= len;
            ty /= len;
            tz /= len;
          }
          N[o3] = tx;
          N[o3 + 1] = ty;
          N[o3 + 2] = tz;
        }
        if (uv) {
          const o2 = (vo + i) * 2;
          U[o2] = ua ? ua[i * 2] : uv.getX(i);
          U[o2 + 1] = ua ? ua[i * 2 + 1] : uv.getY(i);
        }
        C[o3] = cr;
        C[o3 + 1] = cg;
        C[o3 + 2] = cb;
      }
      const index = geo.index;
      const count = index ? index.count : n;
      if (index) {
        const ia = index.array;
        for (let k = 0; k < count; k++) I[io + k] = vo + ia[k];
      } else {
        for (let k = 0; k < count; k++) I[io + k] = vo + k;
      }
      // a mirrored mesh would otherwise show its back faces
      if (rel.determinant() < 0) {
        for (let k = 0; k + 2 < count; k += 3) {
          const t = I[io + k + 1];
          I[io + k + 1] = I[io + k + 2];
          I[io + k + 2] = t;
        }
      }
      vo += n;
      io += count;
    }
    return { P, N, U, C, I, v: vCount, n: iCount };
  }

  // Copy every moving pivot's current world matrix into the shared texture.
  // Returns true if a pivot turned out to be something a batch cannot
  // follow faithfully, so the caller rebuilds without it.
  private place(): boolean {
    let changed = false;
    if (this.slots.size === 0) return false;
    const scene = this.scene;
    const sceneMoved = !isIdentity(scene.matrixWorld);
    if (sceneMoved) _inv.copy(scene.matrixWorld).invert();
    const data = this.matrices.image.data as Float32Array;
    for (const [pivot, slot] of this.slots) {
      const world = pivot.matrixWorld;
      if (!followable(world)) {
        const r = this.recs.get(pivot);
        if (r && !r.blocked) {
          r.blocked = true;
          changed = true;
        }
        continue;
      }
      const e = sceneMoved ? _m.multiplyMatrices(_inv, world).elements : world.elements;
      const o = slot * 16;
      for (let i = 0; i < 16; i++) data[o + i] = e[i];
    }
    this.matrices.needsUpdate = true;
    if (changed) this.dirty = true;
    return changed;
  }
}

function isIdentity(m: Matrix4) {
  const e = m.elements;
  return (
    e[0] === 1 && e[5] === 1 && e[10] === 1 && e[15] === 1 &&
    e[1] === 0 && e[2] === 0 && e[3] === 0 && e[4] === 0 && e[6] === 0 && e[7] === 0 &&
    e[8] === 0 && e[9] === 0 && e[11] === 0 && e[12] === 0 && e[13] === 0 && e[14] === 0
  );
}

// A batch instance gets its normals and its winding right only for a
// matrix that is rotation × scale along its own axes, not mirrored.
function followable(m: Matrix4) {
  const e = m.elements;
  const ax = e[0], ay = e[1], az = e[2];
  const bx = e[4], by = e[5], bz = e[6];
  const cx = e[8], cy = e[9], cz = e[10];
  const det = ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx);
  if (!(det > 0)) return false;
  const la = ax * ax + ay * ay + az * az;
  const lb = bx * bx + by * by + bz * bz;
  const lc = cx * cx + cy * cy + cz * cz;
  const ab = ax * bx + ay * by + az * bz;
  const ac = ax * cx + ay * cy + az * cz;
  const bc = bx * cx + by * cy + bz * cz;
  const tol = 1e-8;
  return ab * ab <= tol * la * lb && ac * ac <= tol * la * lc && bc * bc <= tol * lb * lc;
}

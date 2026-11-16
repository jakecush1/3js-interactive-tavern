import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Material, Object3D, Texture, WebGLRenderer } from "three";
import { HIDDEN_LAYER, SceneBatcher as Batcher } from "../lib/sceneBatcher";
import { imagesInPlace } from "../lib/sceneImages";
import { useGameStore } from "../lib/useGameStore";

// SCENE BATCHER (the component)
// Mount once, last in the scene. It does four jobs:
//
//   1. Runs lib/sceneBatcher.ts, which folds the room's ~1,600 meshes into
//      a few dozen draw calls (see that file for how).
//   2. Owns the render call, so the first frame is only drawn once it can
//      be drawn without stalling: shaders are compiled in the background
//      (the browser does that off the main thread) and, meanwhile, the
//      textures are painted and uploaded a few milliseconds at a time and
//      the paintings and faces finish downloading, instead of everything
//      happening one after another in a multi-second freeze.
//   3. Tells the store when the room is built (the loading screen gives
//      way to the start screen) and when it has actually been drawn (Enter
//      can reveal it).
//   4. Stops drawing while nobody can see the room: behind the start
//      screen, and when the page is scrolled down so far that the band and
//      shows cover it. The animation keeps its place (every frame hook
//      still runs), and a fresh frame is drawn the moment the room is
//      uncovered.

const UPLOAD_SLICE_MS = 8;
// How long the first frame will wait for a painting or a face that is slow
// to download. After this the room opens without it and the picture
// appears when it lands.
const IMAGE_PATIENCE_MS = 15000;
// And how long it will wait for the shaders. A graphics driver that never
// reports them finished must not hold the room back for good: after this
// they are compiled as they are first used, which is what happens anyway
// in a browser that cannot compile in the background.
const SHADER_PATIENCE_MS = 10000;

// Milestones on the browser's performance timeline (DevTools shows them;
// performance.getEntriesByType("mark") reads them back).
const mark = (name: string) => performance.mark(`tavern:${name}`);

// Paint and upload textures in short tasks, yielding to the browser between
// them (a message-channel task rather than a frame, so the work is not
// paced by the display).
function uploadInSlices(gl: WebGLRenderer, textures: Texture[], alive: () => boolean, done: () => void) {
  const channel = new MessageChannel();
  const step = () => {
    const t0 = performance.now();
    while (alive() && textures.length > 0 && performance.now() - t0 < UPLOAD_SLICE_MS) {
      const texture = textures.pop() as Texture;
      try {
        gl.initTexture(texture);
      } catch {
        // one bad texture must not stop the rest: it is left for the frame
        // that first draws it, as it would have been without this warm-up
      }
    }
    if (alive() && textures.length > 0) channel.port2.postMessage(0);
    else {
      channel.port1.close();
      done();
    }
  };
  channel.port1.onmessage = step;
  step();
}

// Call done() once the programs these materials use have finished compiling
// (the browser compiles them in the background and can be asked how far it
// has got). three.js offers compileAsync() for this, but its wait never
// ends if one of the materials is disposed meanwhile, which is what a
// component unmounting during the warm-up does; a visitor who had pressed
// Enter by then was left on the loading screen for good.
function whenCompiled(gl: WebGLRenderer, materials: Set<Material>, alive: () => boolean, done: () => void) {
  const context = gl.getContext();
  const deadline = performance.now() + SHADER_PATIENCE_MS;
  const check = () => {
    if (!alive()) return;
    for (const material of materials) {
      const program = (gl.properties.get(material) as { currentProgram?: { isReady(): boolean } }).currentProgram;
      // no program any more: the material was disposed, there is nothing to wait for
      if (!program || program.isReady()) materials.delete(material);
    }
    if (materials.size === 0 || context.isContextLost() || performance.now() > deadline) done();
    else setTimeout(check, 10);
  };
  check();
}

// A stand-in that looks like the object but has no children, so the
// renderer compiles this object's material and nothing parked beneath it.
const childless = (o: Object3D) => Object.create(o, { children: { value: [] } }) as Object3D;

function texturesOf(objects: Object3D[]) {
  const out = new Set<Texture>();
  for (const o of objects) {
    const m = (o as Object3D & { material?: Material | Material[] }).material;
    for (const mat of Array.isArray(m) ? m : m ? [m] : []) {
      const bag = mat as unknown as Record<string, unknown>;
      for (const k in bag) {
        const v = bag[k] as (Texture & { isRenderTargetTexture?: boolean }) | null;
        // (not looking at .image here: the procedural textures paint themselves when it is read)
        if (v && typeof v === "object" && v.isTexture && !v.isRenderTargetTexture) out.add(v);
      }
    }
  }
  return [...out];
}

export default function SceneBatcher() {
  const scene = useThree((s) => s.scene);
  const raycaster = useThree((s) => s.raycaster);
  const canvas = useThree((s) => s.gl.domElement);
  const batcher = useMemo(() => new Batcher(scene), [scene]);
  // 0 waiting for the first animation tick, 1 warming up, 2 first frame, 3 running
  const phase = useRef(0);
  const mounted = useRef(false);

  useLayoutEffect(() => {
    mounted.current = true;
    batcher.attach();
    // batched meshes sit on a layer the camera skips; pointer events must still find them
    raycaster.layers.enable(HIDDEN_LAYER);
    (window as unknown as { __batcher?: unknown }).__batcher = batcher;
    return () => {
      mounted.current = false;
      batcher.dispose();
      raycaster.layers.disable(HIDDEN_LAYER);
    };
  }, [batcher, raycaster]);

  // Hover glows and song changes start with a pointer event or a store
  // update: tell the batcher to look at everything right away, so they
  // show in the same frame they always did.
  useEffect(() => {
    const touch = () => batcher.touch();
    const target = canvas.parentElement ?? canvas;
    const events = ["pointermove", "pointerdown", "pointerup", "pointerout"] as const;
    for (const e of events) target.addEventListener(e, touch, { passive: true });
    const unsubscribe = useGameStore.subscribe(touch);
    return () => {
      for (const e of events) target.removeEventListener(e, touch);
      unsubscribe();
    };
  }, [batcher, canvas]);

  // The room is out of sight behind the start screen, or under the band and
  // shows when the page is scrolled all the way past it.
  const get = useThree((s) => s.get);
  useEffect(() => {
    const unseen = (s: ReturnType<typeof useGameStore.getState>) => !s.started || s.sceneCovered;
    return useGameStore.subscribe((now, before) => {
      // just uncovered: draw now rather than at the next frame, so what
      // appears is the present moment and not the frame it stopped on
      if (phase.current === 3 && unseen(before) && !unseen(now)) {
        const three = get();
        three.gl.render(three.scene, three.camera);
      }
    });
  }, [get]);

  // Priority 1: runs after every other frame hook, and makes this the
  // place the scene is rendered from.
  useFrame((state) => {
    const { gl, camera } = state;
    if (phase.current === 0) {
      // every animation hook has now run once, so what moves is known
      scene.updateMatrixWorld();
      batcher.sync();
      const drawn = batcher.renderables(camera);
      const textures = texturesOf(drawn.children);
      drawn.children = drawn.children.map(childless);
      phase.current = 1;
      mark("scene-built");
      // the heavy lifting on this thread is done: the start screen can go up
      useGameStore.getState().setBuilt(true);
      // Three things to wait for, side by side: the shaders, the painted
      // textures, and the pictures still downloading.
      let waiting = 3;
      const done = (what: string) => {
        mark(what);
        if (--waiting > 0 || !mounted.current) return;
        // The pictures that arrived meanwhile changed a few meshes (the
        // heads were cut out and resized): bring the batches up to date
        // and upload what is new, so the first frame has nothing left to do.
        scene.updateMatrixWorld();
        batcher.sync();
        const late = texturesOf(batcher.renderables(camera).children);
        uploadInSlices(gl, late, () => mounted.current, () => {
          phase.current = 2;
        });
      };
      let compiling = new Set<Material>();
      try {
        compiling = gl.compile(drawn, camera, scene);
      } catch (error) {
        // the first frame will compile what it needs as it goes
        console.warn("[scene] Could not compile the shaders ahead of the first frame.", error);
      }
      whenCompiled(gl, compiling, () => mounted.current, () => done("shaders-ready"));
      uploadInSlices(gl, textures, () => mounted.current, () => done("textures-ready"));
      Promise.race([imagesInPlace(), new Promise((resolve) => setTimeout(resolve, IMAGE_PATIENCE_MS))]).then(() =>
        done("images-ready")
      );
      return;
    }
    if (phase.current === 1) return;
    if (phase.current === 3) {
      const s = useGameStore.getState();
      if (!s.started || s.sceneCovered) return;
    }
    gl.render(scene, camera);
    if (phase.current === 2) {
      phase.current = 3;
      mark("first-frame");
      useGameStore.getState().setLoaded(true);
    }
  }, 1);

  return null;
}

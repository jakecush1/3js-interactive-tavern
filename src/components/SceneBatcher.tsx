import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Material, Object3D, Texture } from "three";
import { HIDDEN_LAYER, SceneBatcher as Batcher } from "../lib/sceneBatcher";
import { useGameStore } from "../lib/useGameStore";

// SCENE BATCHER (the component)
// Mount once, last in the scene. It does three jobs:
//
//   1. Runs lib/sceneBatcher.ts, which folds the room's ~1,600 meshes into
//      a few dozen draw calls (see that file for how).
//   2. Owns the render call, so the first frame is only drawn once it can
//      be drawn without stalling: shaders are compiled in the background
//      (the browser does that off the main thread) and textures are
//      uploaded a few milliseconds at a time while the loading screen is
//      up, instead of all at once in a multi-second freeze.
//   3. Tells the store when the room is actually on screen, which is what
//      the loading screen waits for.

const UPLOAD_BUDGET_MS = 6;

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
        if (v && typeof v === "object" && v.isTexture && v.image && !v.isRenderTargetTexture) out.add(v);
      }
    }
  }
  return [...out];
}

export default function SceneBatcher() {
  const scene = useThree((s) => s.scene);
  const raycaster = useThree((s) => s.raycaster);
  const batcher = useMemo(() => new Batcher(scene), [scene]);
  // 0 waiting for the first animation tick, 1 warming up, 2 first frame, 3 running
  const phase = useRef(0);
  const compiled = useRef(false);
  const uploads = useRef<Texture[]>([]);

  useLayoutEffect(() => {
    batcher.attach();
    // batched meshes sit on a layer the camera skips; pointer events must still find them
    raycaster.layers.enable(HIDDEN_LAYER);
    (window as unknown as { __batcher?: unknown }).__batcher = batcher;
    return () => {
      batcher.dispose();
      raycaster.layers.disable(HIDDEN_LAYER);
    };
  }, [batcher, raycaster]);

  // Priority 1: runs after every other frame hook, and makes this the
  // place the scene is rendered from.
  useFrame((state) => {
    const { gl, camera } = state;
    if (phase.current === 0) {
      // every animation hook has now run once, so what moves is known
      scene.updateMatrixWorld();
      batcher.sync();
      const drawn = batcher.renderables(camera);
      uploads.current = texturesOf(drawn.children);
      drawn.children = drawn.children.map(childless);
      phase.current = 1;
      gl.compileAsync(drawn, camera, scene)
        .catch(() => {})
        .then(() => {
          compiled.current = true;
        });
      return;
    }
    if (phase.current === 1) {
      const t0 = performance.now();
      while (uploads.current.length > 0 && performance.now() - t0 < UPLOAD_BUDGET_MS) {
        gl.initTexture(uploads.current.pop() as Texture);
      }
      if (compiled.current && uploads.current.length === 0) phase.current = 2;
      return;
    }
    gl.render(scene, camera);
    if (phase.current === 2) {
      phase.current = 3;
      useGameStore.getState().setLoaded(true);
    }
  }, 1);

  return null;
}

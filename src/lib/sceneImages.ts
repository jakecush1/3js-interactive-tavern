import { useLayoutEffect, useMemo, useSyncExternalStore } from "react";
import { Texture } from "three";

// SCENE IMAGES
// The paintings on the walls and the band's painted heads are the only
// image files the 3D room downloads. They used to be loaded with
// useLoader, which suspends: nothing in the room could be built until the
// last of them had arrived, so a megabyte of pictures stood in line ahead
// of all the work that does not need them.
//
// Here a component asks for an image and gets null until it is in, then
// re-renders with it. The room is built, its shaders compiled and its
// textures painted while the pictures are still on their way, and the only
// thing that waits for them is the reveal: SceneBatcher holds the first
// frame until imagesInPlace() resolves, so the room is never shown with a
// blank canvas on the wall or a faceless musician.
//
// The pictures are deliberately not preloaded from index.html. That was
// tried: on a slow connection they then share the line with the scripts,
// and the start screen, which needs only the scripts, arrived seconds
// later. Asked for from here, they start the moment the code runs and
// download while the room is being built.

type Entry = {
  image: HTMLImageElement;
  state: "loading" | "ready" | "failed";
  watchers: Set<() => void>;
};

const entries = new Map<string, Entry>();
/** One token per mounted component that is still waiting to render with its image. */
const waiting = new Set<object>();
const whenIdle = new Set<() => void>();

function request(url: string): Entry {
  let entry = entries.get(url);
  if (!entry) {
    const made: Entry = { image: new Image(), state: "loading", watchers: new Set() };
    const settle = (state: Entry["state"]) => {
      made.state = state;
      if (state === "failed") console.warn(`[scene] Could not load ${url}; the room will open without it.`);
      for (const w of made.watchers) w();
    };
    const load = (src: string, fallback: string | null) => {
      const image = new Image();
      made.image = image;
      // as three.js's own loaders request images
      image.crossOrigin = "anonymous";
      image.src = src;
      // decode() does the decoding off the main thread, instead of in the
      // middle of the first upload to the GPU
      image.decode().then(
        () => settle("ready"),
        () => (fallback ? load(fallback, null) : settle("failed"))
      );
    };
    // The faces are WebP, each made (without loss) from a PNG of the same
    // name that is still beside it. A browser too old to read WebP (Safari
    // before macOS 11) gets the PNG.
    load(url, url.endsWith(".webp") ? url.slice(0, -5) + ".png" : null);
    entries.set(url, made);
    entry = made;
  }
  return entry;
}

/** The image once it has loaded, null until then (and if it fails). */
export function useSceneImage(url: string): HTMLImageElement | null {
  const entry = request(url);
  const state = useSyncExternalStore(
    (notify) => {
      entry.watchers.add(notify);
      return () => entry.watchers.delete(notify);
    },
    () => entry.state
  );
  // Counted as waiting from mount until the commit in which this component
  // has rendered with the image (or learned that it is not coming).
  useLayoutEffect(() => {
    if (state !== "loading") return;
    const token = {};
    waiting.add(token);
    return () => {
      waiting.delete(token);
      if (waiting.size === 0) {
        for (const done of whenIdle) done();
        whenIdle.clear();
      }
    };
  }, [state]);
  return state === "ready" ? entry.image : null;
}

/** A texture of the image: empty until it arrives, then filled in. */
export function useImageTexture(url: string): Texture {
  const image = useSceneImage(url);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const texture = useMemo(() => new Texture(), [url]);
  useLayoutEffect(() => {
    if (!image) return;
    texture.image = image;
    texture.needsUpdate = true;
  }, [texture, image]);
  return texture;
}

/** Resolves once every component that asked for an image has rendered with it. */
export function imagesInPlace(): Promise<void> {
  return waiting.size === 0 ? Promise.resolve() : new Promise((resolve) => whenIdle.add(resolve));
}

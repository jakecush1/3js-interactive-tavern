# Side Project — Interactive Band Page

A custom-made band page for **Side Project**, built as an interactive 3D medieval tavern in Three.js. Four musicians sit around a candlelit table — click glowing objects to change songs (the site plays the band's actual music), click the room to rain beer bottles.

See live demo at [sideproj.ca](https://sideproj.ca/)

Listen to Side Project:
- [Bandcamp](https://sideproject420.bandcamp.com/)
- [Spotify](https://open.spotify.com/artist/1OgS3t9zHbTivlQocswe9C)

Built with Vite + React + TypeScript + React Three Fiber + Zustand + Howler.js + Tailwind CSS.

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173 and click **Enter the Tavern**.

## Audio

MP3s live in `/public/audio/` and are mapped to songs in `src/data/songs.ts`, grouped into the three Bandcamp albums (The New Normal, Demos, Live at Michelle and Everette's). Tracks load on first play, not up front; the next song in the set is fetched half a minute before the current one ends, so the set runs on without a gap, and only the current and previous songs are kept decoded in memory. Missing files don't crash the app — it logs a warning and keeps running.

## Customizing

- **Band members** — `src/data/bandMembers.ts` (name, bio, instrument, color, position)
- **Songs** — `src/data/songs.ts`, plus `src/data/clickableObjects.ts` for in-scene triggers
- **Characters** — everyone is built from the procedural Renaissance figure kit in `src/components/characters/Figure.tsx`: a human body to real proportions with turned, muscle-shaped limbs and a full joint skeleton (hips, knees, ankles, spine, shoulders, elbows, neck), dressed per `look` (builds, doublets, sleeves, collars, hats, hair, beards, expressions). Full-body motion lives in `src/components/characters/animation.ts` — `poseWalk` (a real walk cycle paced by distance so feet never slide), `poseDance` (a samba in time with the song) and `poseStagger` (the drunk by the bar); call `useRig()` for a set of joint refs and pass it to `<Figure refs>`. Each band member's `look` lives in `src/data/bandMembers.ts`; `look.face` points at the member's head cutout in `/public/band/Heads` (white background is keyed out automatically and wrapped onto the 3D head). The `*-head.webp` files are lossless copies of the `*-head.png` beside them, a third smaller; after editing a PNG, remake its WebP with `cwebp -lossless -z 9 -exact x-head.png -o x-head.webp`, or just point `url` at the PNG. To swap in real GLB models later, replace `<Figure />` inside `src/components/BandMember.tsx`.
- **Textures** — wood, stone, plaster, cloth, leather, rug and banner textures are generated at runtime in `src/lib/textures.ts`; no image downloads. Each is painted the first time the renderer needs it.
- **Debug camera** — append `#cam=x,y,z,tx,ty,tz` to the URL to park the camera for close-up screenshots (`node _shot2.mjs out.png "#cam=..."` with the dev server on port 5174; `node _shot3.mjs out.png "#cam=...&instant" 9,12,15` takes a burst of frames at those seconds after load, handy for catching the walking and dancing figures mid-move).
- **Contact / shows** — `src/components/ui/FooterOverlay.tsx`

## Structure

```
src/
  components/   # 3D scene, characters, effects, lighting, UI overlays
  data/         # Band member, song, and clickable-object config
  lib/          # Zustand store, Howler audio manager, scene batcher, textures, tuning constants
  assets/fonts/ # The three typefaces, served from the site itself
public/audio/   # MP3 files
public/_headers # Cache rules for the hosted site
```

## Performance

The room is built from about 1,600 small meshes, and it is the number of meshes, not the number of triangles, that costs frame time. A few things keep it quick; none of them needs attention when adding to the scene, but they are worth knowing about.

- **Batching** — `src/lib/sceneBatcher.ts` draws meshes that share a kind of material and move together in a single draw call (about 180 calls per frame instead of about 1,700). It works out by itself what moves, what is hovered, what has been added or removed, so components are written as usual. The original meshes stay in the scene, hidden from the camera, and pointer events still hit them. To keep one mesh out of it: `userData={{ noBatch: true }}`. `window.__batcher.stats()` in the console shows what it is doing, and `node _perf.mjs` reports draw calls.
- **Loading** — the loading screen is plain HTML in `index.html` (`#boot`), so it is on screen before any script arrives; `src/components/ui/LoadingScreen.tsx` is the same markup and the two should be kept in step. It gives way to the start screen as soon as the room is built. Shaders are compiled in the background, textures painted a few milliseconds at a time, and the paintings and faces downloaded, all at once rather than in turn; if Enter is pressed before the first frame is ready, the reveal waits for it. The steps show up as `tavern:*` marks in the browser's performance timeline.
- **Images in the room** — load them with `useSceneImage` / `useImageTexture` from `src/lib/sceneImages.ts` rather than `useLoader`, which would make the whole room wait for the download before building anything.
- **Not drawing what cannot be seen** — the scene is not rendered behind the start screen, or once the page is scrolled far enough that the band and shows cover it. Animation keeps its place.
- **Fonts** — Cinzel, EB Garamond and IBM Plex Mono are in `src/assets/fonts` with their rules in `src/styles/fonts.css` (the same files and subsets Google Fonts serves).
- **Caching** — `public/_headers` lets browsers keep the hashed files under `/assets` for good; songs and pictures are still checked for changes on each visit.

## Future Ideas

Beat-synced animations, a music visualizer, merch table, Easter eggs, and a mobile-optimised scene variant.

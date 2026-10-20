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

MP3s live in `/public/audio/` and are mapped to songs in `src/data/songs.ts`. Missing files don't crash the app — it logs a warning and keeps running.

## Customizing

- **Band members** — `src/data/bandMembers.ts` (name, bio, instrument, color, position)
- **Songs** — `src/data/songs.ts`, plus `src/data/clickableObjects.ts` for in-scene triggers
- **Characters** — everyone is built from the procedural Renaissance figure kit in `src/components/characters/Figure.tsx` (builds, doublets, sleeves, collars, hats, hair, beards, expressions). Each band member's `look` lives in `src/data/bandMembers.ts`; `look.face` points at the member's head cutout in `/public/band/Heads` (white background is keyed out automatically and wrapped onto the 3D head). To swap in real GLB models later, replace `<Figure />` inside `src/components/BandMember.tsx`.
- **Textures** — wood, stone, plaster, cloth, leather, rug and banner textures are generated at runtime in `src/lib/textures.ts`; no image downloads.
- **Debug camera** — append `#cam=x,y,z,tx,ty,tz` to the URL to park the camera for close-up screenshots (`node _shot2.mjs out.png "#cam=..."` with the dev server on port 5174).
- **Contact / shows** — `src/components/ui/FooterOverlay.tsx`

## Structure

```
src/
  components/   # 3D scene, characters, effects, lighting, UI overlays
  data/         # Band member, song, and clickable-object config
  lib/          # Zustand store, Howler audio manager, tuning constants
public/audio/   # MP3 files
```

## Future Ideas

Beat-synced animations, a music visualizer, merch table, Easter eggs, and a mobile-optimised scene variant.

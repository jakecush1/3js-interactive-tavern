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
- **3D models** — characters are primitive shapes; swap in GLBs via `useGLTF` in `src/components/BandMember.tsx`
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

Real GLB character models, beat-synced animations, a music visualizer, merch table, Easter eggs, and a mobile-optimised scene variant.

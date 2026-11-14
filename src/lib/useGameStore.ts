import { create } from "zustand";
import { songs } from "../data/songs";
import { DEFAULT_VOLUME } from "./constants";

type GameState = {
  /** The 3D room is mounted and warming up: the start screen can be shown. */
  built: boolean;
  /** The room has drawn its first frame: it can be revealed. */
  loaded: boolean;
  /** The visitor has pressed Enter. */
  entered: boolean;
  /** Entered and loaded: the room is on show. */
  started: boolean;
  muted: boolean;
  volume: number;
  isPlaying: boolean;
  currentSongId: string | null;
  focusedMemberId: string | null;
  reducedMotion: boolean;
  bottleSpawnNonce: number;
  lastSpawnPoint: [number, number, number] | null;
  /** The page is scrolled down past the 3D scene to the band/shows content. */
  scrolledPast: boolean;
  /** Scrolled so far that the content covers the 3D scene completely. */
  sceneCovered: boolean;

  start: () => void;
  enter: () => void;
  setBuilt: (v: boolean) => void;
  setLoaded: (v: boolean) => void;
  toggleMute: () => void;
  setVolume: (v: number) => void;
  setPlaying: (v: boolean) => void;
  selectSong: (id: string | null) => void;
  nextSong: () => void;
  focusMember: (id: string | null) => void;
  spawnBottles: (point?: [number, number, number]) => void;
  setReducedMotion: (v: boolean) => void;
  setScrolledPast: (v: boolean) => void;
  setSceneCovered: (v: boolean) => void;
};

export const useGameStore = create<GameState>((set, get) => ({
  built: false,
  loaded: false,
  entered: false,
  started: false,
  muted: false,
  volume: DEFAULT_VOLUME,
  isPlaying: false,
  currentSongId: null,
  focusedMemberId: null,
  reducedMotion: false,
  bottleSpawnNonce: 0,
  lastSpawnPoint: null,
  scrolledPast: false,
  sceneCovered: false,

  start: () => set({ entered: true, started: true }),
  // Enter reveals the room at once if it is ready, or as soon as it is.
  enter: () => set((s) => ({ entered: true, started: s.loaded })),
  setBuilt: (v) => set({ built: v }),
  setLoaded: (v) => set((s) => ({ loaded: v, started: s.started || (v && s.entered) })),
  toggleMute: () => set((s) => ({ muted: !s.muted })),
  setVolume: (v) => set({ volume: v }),
  setPlaying: (v) => set({ isPlaying: v }),
  selectSong: (id) => set({ currentSongId: id, isPlaying: id !== null }),
  nextSong: () => {
    const { currentSongId } = get();
    const idx = songs.findIndex((s) => s.id === currentSongId);
    const next = songs[(idx + 1) % songs.length];
    set({ currentSongId: next.id, isPlaying: true });
  },
  focusMember: (id) => set({ focusedMemberId: id }),
  spawnBottles: (point) =>
    set((s) => ({
      bottleSpawnNonce: s.bottleSpawnNonce + 1,
      lastSpawnPoint: point ?? null,
    })),
  setReducedMotion: (v) => set({ reducedMotion: v }),
  setScrolledPast: (v) => set((s) => (s.scrolledPast === v ? s : { scrolledPast: v })),
  setSceneCovered: (v) => set((s) => (s.sceneCovered === v ? s : { sceneCovered: v })),
}));

// Expose for dev tooling (harmless in production)
if (typeof window !== "undefined") {
  (window as unknown as { __store?: unknown }).__store = useGameStore;
}

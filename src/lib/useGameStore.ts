import { create } from "zustand";
import { songs } from "../data/songs";
import { DEFAULT_VOLUME } from "./constants";

type GameState = {
  started: boolean;
  loaded: boolean;
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

  start: () => void;
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
};

export const useGameStore = create<GameState>((set, get) => ({
  started: false,
  loaded: false,
  muted: false,
  volume: DEFAULT_VOLUME,
  isPlaying: false,
  currentSongId: null,
  focusedMemberId: null,
  reducedMotion: false,
  bottleSpawnNonce: 0,
  lastSpawnPoint: null,
  scrolledPast: false,

  start: () => set({ started: true }),
  setLoaded: (v) => set({ loaded: v }),
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
}));

// Expose for dev tooling (harmless in production)
if (typeof window !== "undefined") {
  (window as unknown as { __store?: unknown }).__store = useGameStore;
}

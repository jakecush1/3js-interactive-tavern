import { Howl, Howler } from "howler";
import { songs, AMBIENT_TRACK } from "../data/songs";
import { FADE_MS } from "./constants";

// AUDIO MANAGER
// Wraps Howler.js. Safe against missing files: if a track fails to load,
// we log a warning and resolve gracefully so the UI/animation keep working.
//
// To add real audio: drop files in /public/audio and make sure the paths in
// src/data/songs.ts match. Nothing else needs to change.

type LoadedHowl = {
  howl: Howl;
  available: boolean;
};

class AudioManager {
  private tracks = new Map<string, LoadedHowl>();
  private ambient: LoadedHowl | null = null;
  private currentId: string | null = null;
  private volume = 0.7;
  private muted = false;
  private initialized = false;
  private onSongEnd: ((songId: string) => void) | null = null;

  /** Called when a song plays out; the store uses it to move on to the next tune. */
  setOnSongEnd(cb: ((songId: string) => void) | null) {
    this.onSongEnd = cb;
  }

  // Called after the user clicks "Enter the Tavern" (unlocks audio context).
  init() {
    if (this.initialized) return;
    this.initialized = true;

    // Preload song howls
    songs.forEach((song) => {
      const howl = new Howl({
        src: [song.file],
        loop: false, // the set loops as a playlist (see onend), not one song on repeat
        volume: 0,
        html5: false, // Web Audio: fade()/crossfade works reliably (html5 fades stay stuck at 0)
        onend: () => {
          if (this.currentId === song.id) this.onSongEnd?.(song.id);
        },
        onloaderror: () => {
          const t = this.tracks.get(song.id);
          if (t) t.available = false;
          console.warn(
            `[audio] Missing or unplayable file for "${song.title}" (${song.file}). ` +
              `UI and animations will continue without audio.`
          );
        },
      });
      this.tracks.set(song.id, { howl, available: true });
    });

    // Ambient loop (optional)
    const ambientHowl = new Howl({
      src: [AMBIENT_TRACK],
      loop: true,
      volume: 0,
      html5: true,
      onloaderror: () => {
        if (this.ambient) this.ambient.available = false;
        console.warn(
          `[audio] No ambient track found at ${AMBIENT_TRACK} (optional).`
        );
      },
    });
    this.ambient = { howl: ambientHowl, available: true };
  }

  startAmbient() {
    if (!this.ambient || !this.ambient.available || this.muted) return;
    try {
      this.ambient.howl.play();
      this.ambient.howl.fade(0, this.volume * 0.25, FADE_MS);
    } catch {
      /* ignore */
    }
  }

  play(songId: string) {
    if (!this.initialized) this.init();

    // Fade out current
    if (this.currentId && this.currentId !== songId) {
      const prev = this.tracks.get(this.currentId);
      if (prev?.available) {
        prev.howl.fade(prev.howl.volume(), 0, FADE_MS);
        const h = prev.howl;
        window.setTimeout(() => h.stop(), FADE_MS + 50);
      }
    }

    this.currentId = songId;
    const next = this.tracks.get(songId);
    if (!next || !next.available) {
      // Missing file — already warned at load. Keep UI state going.
      return;
    }

    const target = this.muted ? 0 : this.volume;
    if (!next.howl.playing()) next.howl.play();
    next.howl.fade(0, target, FADE_MS);
  }

  pause() {
    if (!this.currentId) return;
    const t = this.tracks.get(this.currentId);
    if (t?.available) {
      t.howl.fade(t.howl.volume(), 0, FADE_MS / 2);
      const h = t.howl;
      window.setTimeout(() => h.pause(), FADE_MS / 2 + 20);
    }
  }

  resume() {
    if (!this.currentId) return;
    const t = this.tracks.get(this.currentId);
    if (t?.available) {
      if (!t.howl.playing()) t.howl.play();
      t.howl.fade(0, this.muted ? 0 : this.volume, FADE_MS / 2);
    }
  }

  stop() {
    if (!this.currentId) return;
    const t = this.tracks.get(this.currentId);
    if (t?.available) t.howl.stop();
    this.currentId = null;
  }

  setVolume(v: number) {
    this.volume = v;
    if (this.muted) return;
    if (this.currentId) {
      const t = this.tracks.get(this.currentId);
      if (t?.available) t.howl.volume(v);
    }
    if (this.ambient?.available) this.ambient.howl.volume(v * 0.25);
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    Howler.mute(muted);
  }

  // Play a one-shot sound effect (e.g. clink, hover). Safe if missing.
  playSfx(src: string, volume = 0.4) {
    if (this.muted) return;
    const sfx = new Howl({
      src: [src],
      volume: volume * this.volume,
      html5: false,
      onloaderror: () => {
        /* silent — sfx are optional */
      },
    });
    try {
      sfx.play();
    } catch {
      /* ignore */
    }
  }
}

export const audioManager = new AudioManager();

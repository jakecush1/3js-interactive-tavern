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

// A song is played from memory, fully decoded (that is what makes the
// crossfades work), and decoded audio is big: roughly 20 MB a minute, so
// 60 to 160 MB a song. Howler never lets go of one by itself, and the set
// plays on from song to song, so an evening's listening used to pile up
// past a gigabyte. Now only the song playing and the one before it are
// kept, plus the next one once it has been fetched ahead of time.
const KEEP_DECODED = 2;
// The next song in the set is fetched and decoded this long before the
// current one ends, so it starts on the beat instead of after a download.
const PRELOAD_LEAD_S = 30;

class AudioManager {
  private tracks = new Map<string, LoadedHowl>();
  private ambient: LoadedHowl | null = null;
  private currentId: string | null = null;
  private volume = 0.7;
  private muted = false;
  private initialized = false;
  private onSongEnd: ((songId: string) => void) | null = null;
  /** Song ids, most recently played first. */
  private recent: string[] = [];
  private upNext: string | null = null;
  private preloadTimer: number | null = null;
  private sfx = new Map<string, Howl>();
  private missingSfx = new Set<string>();

  /** Called when a song plays out; the store uses it to move on to the next tune. */
  setOnSongEnd(cb: ((songId: string) => void) | null) {
    this.onSongEnd = cb;
  }

  // Setting up the browser's audio engine takes a moment (a fifth of a
  // second on a fast laptop), and it used to happen inside the Enter click,
  // which is exactly when the page should be answering at once. Call this
  // while the start screen is up instead. Until the visitor has clicked,
  // the browser keeps the engine paused (and may say so in the console);
  // Howler wakes it on that first click, as it does for any page that sets
  // up sound before being touched.
  warm() {
    if (!Howler.ctx) Howler.volume(Howler.volume());
  }

  // Called after the user clicks "Enter the Tavern" (unlocks audio context).
  // Songs are loaded the first time they are asked for (nineteen tracks is
  // too much to pull down on arrival); only the ambient loop starts now.
  init() {
    if (this.initialized) return;
    this.initialized = true;

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

  // The howl for a song, created (and started loading) on first use.
  private track(songId: string): LoadedHowl | undefined {
    const existing = this.tracks.get(songId);
    if (existing) return existing;
    const song = songs.find((s) => s.id === songId);
    if (!song) return undefined;
    const howl = new Howl({
      src: [song.file],
      loop: false, // the set loops as a playlist (see onend), not one song on repeat
      volume: 0,
      html5: false, // Web Audio: fade()/crossfade works reliably (html5 fades stay stuck at 0)
      onplay: () => {
        if (this.currentId === song.id) this.planNext(song.id, howl);
      },
      onpause: () => {
        if (this.currentId === song.id) this.cancelNext();
      },
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
    const entry = { howl, available: true };
    this.tracks.set(song.id, entry);
    return entry;
  }

  // Once a song is under way, arrange for the one after it to be ready
  // shortly before this one ends (not sooner: if the listener stops here,
  // nothing was downloaded for nothing).
  private planNext(songId: string, howl: Howl) {
    this.cancelNext();
    const at = howl.seek();
    const remaining = howl.duration() - (typeof at === "number" ? at : 0);
    this.preloadTimer = window.setTimeout(() => {
      this.preloadTimer = null;
      if (this.currentId !== songId) return;
      const i = songs.findIndex((s) => s.id === songId);
      const next = songs[(i + 1) % songs.length];
      if (!next) return;
      this.upNext = next.id;
      this.track(next.id);
      this.release();
    }, Math.max(0, remaining - PRELOAD_LEAD_S) * 1000);
  }

  private cancelNext() {
    if (this.preloadTimer !== null) {
      window.clearTimeout(this.preloadTimer);
      this.preloadTimer = null;
    }
  }

  // Let go of decoded songs that are no longer needed. A song that is
  // played again later is fetched from the browser's cache and decoded
  // afresh.
  private release() {
    const keep = new Set(this.recent.slice(0, KEEP_DECODED));
    if (this.currentId) keep.add(this.currentId);
    if (this.upNext) keep.add(this.upNext);
    for (const [id, entry] of this.tracks) {
      if (keep.has(id) || entry.howl.playing() || entry.howl.state() === "loading") continue;
      entry.howl.unload();
      this.tracks.delete(id);
    }
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
      this.cancelNext();
      const prev = this.tracks.get(this.currentId);
      if (prev?.available) {
        prev.howl.fade(prev.howl.volume(), 0, FADE_MS);
        const h = prev.howl;
        window.setTimeout(() => {
          h.stop();
          this.release();
        }, FADE_MS + 50);
      }
    }

    this.currentId = songId;
    this.recent = [songId, ...this.recent.filter((id) => id !== songId)];
    if (this.upNext === songId) this.upNext = null;
    const next = this.track(songId);
    if (!next || !next.available) {
      // Missing file — warned when it failed to load. Keep UI state going.
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
    this.cancelNext();
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

  // Play a one-shot sound effect (e.g. clink, hover). Safe if missing: a
  // file that is not there is asked for once, not on every click.
  playSfx(src: string, volume = 0.4) {
    if (this.muted || this.missingSfx.has(src)) return;
    let sfx = this.sfx.get(src);
    if (!sfx) {
      const made = new Howl({
        src: [src],
        html5: false,
        onloaderror: () => {
          /* silent — sfx are optional */
          this.missingSfx.add(src);
          this.sfx.delete(src);
          made.unload();
        },
      });
      this.sfx.set(src, made);
      sfx = made;
    }
    try {
      const id = sfx.play();
      sfx.volume(volume * this.volume, id);
    } catch {
      /* ignore */
    }
  }
}

export const audioManager = new AudioManager();

// Expose for dev tooling (harmless in production)
if (typeof window !== "undefined") {
  (window as unknown as { __audio?: unknown }).__audio = audioManager;
}

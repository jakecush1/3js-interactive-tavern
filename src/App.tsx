import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useGameStore } from "./lib/useGameStore";
import { audioManager } from "./lib/audioManager";
import Experience from "./components/Experience";
import StartScreen from "./components/ui/StartScreen";
import LoadingScreen from "./components/ui/LoadingScreen";
import Header from "./components/ui/Header";
import SongPanel from "./components/ui/SongPanel";
import BandMemberPanel from "./components/ui/BandMemberPanel";
import InteractionHints from "./components/ui/InteractionHints";
import FooterOverlay from "./components/ui/FooterOverlay";

// How long the room may take before the visitor is let through without it.
const ROOM_PATIENCE_MS = 20000;
// The room stops being drawn once the content below has slid over all of
// it, and a little further: this far past the top of the window, plus a few
// frames' worth of travel when the page is being scrolled back up, so that
// drawing has always resumed before any of the room comes back into view.
const COVER_MARGIN_PX = 48;
const COVER_LOOKAHEAD_FRAMES = 4;

// Run fn once the page has been in view for `ms` at a stretch. The room is
// built and drawn from animation frames, and a tab in the background gets
// none, so time spent there says nothing about whether it is stuck.
function afterInView(ms: number, fn: () => void) {
  let timer = 0;
  const arm = () => {
    window.clearTimeout(timer);
    if (document.visibilityState === "visible") timer = window.setTimeout(fn, ms);
  };
  document.addEventListener("visibilitychange", arm);
  arm();
  return () => {
    window.clearTimeout(timer);
    document.removeEventListener("visibilitychange", arm);
  };
}

export default function App() {
  const started = useGameStore((s) => s.started);
  const setReducedMotion = useGameStore((s) => s.setReducedMotion);
  const setScrolledPast = useGameStore((s) => s.setScrolledPast);
  const setSceneCovered = useGameStore((s) => s.setSceneCovered);
  // The loading screen stays until the room is actually built (the scene
  // reports that itself), not for a fixed time. Then the start screen
  // shows while the last of the warm-up finishes behind it.
  const built = useGameStore((s) => s.built);
  const loaded = useGameStore((s) => s.loaded);
  const entered = useGameStore((s) => s.entered);
  const [gaveUp, setGaveUp] = useState(false);
  // Built, but its first frame has not come in a long while.
  const [overdue, setOverdue] = useState(false);
  const loading = !built && !gaveUp;
  // Enter was pressed before the first frame was ready. Usually that is a
  // fraction of a second, and the start screen simply stays put; if it
  // drags on, say so with the loading screen.
  const waiting = entered && !started;
  const [waitingLong, setWaitingLong] = useState(false);
  // The loading screen visitors see first is plain HTML in index.html, up
  // before this code has even been downloaded.
  const [bootScreen] = useState(() => document.getElementById("boot"));
  const scroller = useRef<HTMLDivElement>(null);
  // The spacer that holds the content one screen down; where it ends, the
  // opaque content begins.
  const fold = useRef<HTMLDivElement>(null);

  // This component draws the gilded frame from here on.
  useLayoutEffect(() => {
    document.getElementById("boot-frame")?.remove();
  }, []);

  useEffect(() => {
    if (!loading) bootScreen?.remove();
  }, [loading, bootScreen]);

  useEffect(() => {
    if (!waiting) {
      setWaitingLong(false);
      return;
    }
    const timer = setTimeout(() => setWaitingLong(true), 400);
    return () => clearTimeout(timer);
  }, [waiting]);

  // The room is not coming (it failed, or never reported in, or was built
  // and then never drew): Enter lets the visitor through anyway.
  useEffect(() => {
    if (waiting && (built ? overdue : gaveUp)) useGameStore.getState().start();
  }, [waiting, built, overdue, gaveUp]);

  // The root div (not the window) scrolls. Once the reader is down at the
  // band/shows content, the fixed overlays tuck themselves out of the way.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    let lastTop = el.scrollTop;
    let settle = 0;
    // `rising`: how far the content has just moved back down the window
    const measure = (rising: number) => {
      setScrolledPast(el.scrollTop > el.clientHeight * 0.55);
      // Once the opaque content has slid over the whole canvas the scene
      // stops being drawn, until some of it is about to show again. This
      // is measured, not worked out from the scroll position: on a phone
      // the screen of space above the content is taller than the window.
      const edge = fold.current ? fold.current.getBoundingClientRect().bottom : Infinity;
      setSceneCovered(edge <= -(COVER_MARGIN_PX + COVER_LOOKAHEAD_FRAMES * rising));
    };
    const onScroll = () => {
      const top = el.scrollTop;
      const rising = Math.max(0, lastTop - top);
      lastTop = top;
      measure(rising);
      // and once more when the scrolling has stopped
      window.clearTimeout(settle);
      settle = window.setTimeout(() => measure(0), 150);
    };
    // A window resized or a phone turned moves the content without a
    // scroll event.
    const resized = new ResizeObserver(() => measure(0));
    resized.observe(el);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearTimeout(settle);
      resized.disconnect();
      el.removeEventListener("scroll", onScroll);
    };
  }, [setScrolledPast, setSceneCovered]);

  // When a song plays out, carry on to the next one so the set loops.
  useEffect(() => {
    audioManager.setOnSongEnd(() => useGameStore.getState().nextSong());
    return () => audioManager.setOnSongEnd(null);
  }, []);

  // Respect reduced motion preference
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [setReducedMotion]);

  // If the 3D scene never reports in, don't strand the visitor on the
  // loading screen: the music and everything below the fold work without
  // it. A browser with no WebGL fails loudly and at once, so any error
  // while the room is still being built lets them through immediately;
  // the timer catches a room that fails quietly.
  useEffect(() => {
    if (built) return;
    const giveUp = () => setGaveUp(true);
    const cancel = afterInView(ROOM_PATIENCE_MS, giveUp);
    window.addEventListener("error", giveUp);
    window.addEventListener("unhandledrejection", giveUp);
    return () => {
      cancel();
      window.removeEventListener("error", giveUp);
      window.removeEventListener("unhandledrejection", giveUp);
    };
  }, [built]);

  // Likewise once it is built: the shaders, textures and pictures the
  // first frame waits for each have their own limit, so this only catches
  // a failure nothing else did. Without it, Enter would lead to a loading
  // screen that never ends.
  useEffect(() => {
    if (!built || loaded) return;
    return afterInView(ROOM_PATIENCE_MS, () => setOverdue(true));
  }, [built, loaded]);

  // Keep audio volume in sync if changed externally
  useEffect(() => {
    audioManager.setVolume(useGameStore.getState().volume);
  }, []);

  return (
    <div id="app-scroll" ref={scroller} className="relative w-full h-full overflow-x-hidden overflow-y-auto">
      {/* Fixed full-screen canvas */}
      <div className="fixed inset-0 w-full h-full">
        <Experience />
      </div>

      {/* Chiaroscuro vignette: the scene falls off into oil-painting darkness */}
      <div
        className="fixed inset-0 z-10 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 42%, transparent 42%, rgba(23,17,11,0.5) 78%, rgba(14,10,6,0.92) 100%)",
        }}
      />
      {/* Canvas grain — cracked-varnish noise over everything (desktop only:
          each full-screen layer is a composite pass a phone GPU can't spare) */}
      <div
        className="fixed inset-0 z-10 pointer-events-none hidden md:block"
        style={{
          // plain alpha blending: mix-blend modes over a live WebGL canvas
          // force an expensive full-screen composite every frame
          opacity: 0.16,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")",
        }}
      />
      {/* Etching crosshatch — engraving-plate diagonal strokes */}
      <div
        className="fixed inset-0 z-10 pointer-events-none hidden md:block"
        style={{
          opacity: 0.12,
          backgroundImage:
            "repeating-linear-gradient(45deg, rgba(233,220,190,0.5) 0 1px, transparent 1px 7px), repeating-linear-gradient(-45deg, rgba(18,13,6,0.6) 0 1px, transparent 1px 9px)",
        }}
      />
      {/* Gilded ebony frame around the viewport — ink, gold pinline, ink */}
      <div
        className="fixed inset-0 z-[70] pointer-events-none"
        style={{
          boxShadow:
            "inset 0 0 0 4px #120d06, inset 0 0 0 5px #c68a2c, inset 0 0 0 7px #120d06, inset 0 0 60px rgba(0,0,0,0.55)",
        }}
      />

      {/* Overlays (only after entering) */}
      {started && (
        <>
          <div className="fixed inset-0 pointer-events-none z-30">
            <div className="relative w-full h-full">
              <div className="pointer-events-auto">
                <Header />
                <SongPanel />
                <BandMemberPanel />
                <InteractionHints />
              </div>
            </div>
          </div>

          {/* Spacer to push content below the 100vh canvas.
              pointer-events-none so the transparent 100vh region over the
              canvas stays click-through; FooterOverlay re-enables events on
              its own interactive content. */}
          <div className="relative pointer-events-none">
            <div ref={fold} className="h-screen pointer-events-none" />
            <FooterOverlay />
          </div>
        </>
      )}

      {/* Gates */}
      {((loading && !bootScreen) || (waiting && waitingLong)) && <LoadingScreen />}
      {!loading && !started && !(waiting && waitingLong) && <StartScreen />}
    </div>
  );
}

import { useEffect } from "react";
import { useGameStore } from "../../lib/useGameStore";
import { audioManager } from "../../lib/audioManager";

// START SCREEN
// Browsers require a user gesture before audio. This gate unlocks the audio
// context, starts ambient sound, and reveals the experience. It is shown as
// soon as the room is built; if Enter is pressed in the moment before the
// room has drawn its first frame, the reveal waits for that (see App.tsx).

export default function StartScreen() {
  const enter = useGameStore((s) => s.enter);

  // Get the audio engine ready while the visitor reads the screen, so the
  // click on Enter is answered immediately.
  useEffect(() => {
    const timer = window.setTimeout(() => audioManager.warm(), 300);
    return () => window.clearTimeout(timer);
  }, []);

  const handleEnter = () => {
    // (this screen stays up for a moment if the room is not quite ready: a
    // second press must not start the ambience a second time)
    if (!useGameStore.getState().entered) {
      audioManager.init();
      audioManager.startAmbient();
    }
    enter();
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#17110b]">
      {/* Chiaroscuro backdrop: candlelit halo center, cold ultramarine
          and verdigris bleeding in from the corners */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 38%, rgba(226,170,69,0.22), transparent 55%), radial-gradient(ellipse at 0% 100%, rgba(42,79,208,0.28), transparent 55%), radial-gradient(ellipse at 100% 0%, rgba(58,125,116,0.25), transparent 50%), radial-gradient(ellipse at 100% 100%, rgba(143,43,34,0.3), transparent 60%)",
        }}
      />
      <div className="relative max-w-lg px-8 text-center animate-fade-in">
        <p className="font-mono text-tavern-gold/80 text-xs tracking-[0.35em] uppercase mb-4">
          ~ Pull up a stool ~
        </p>
        <h1 className="font-medieval gold-text text-5xl sm:text-6xl font-black mb-6 leading-tight">
          Side Proj
        </h1>
        <p className="text-tavern-linen/85 text-lg mb-10 italic">
          A strange little medieval band waiting for your command.
        </p>
        <button
          onClick={handleEnter}
          className="btn-tavern font-medieval text-lg px-10 py-4 tracking-wide uppercase"
          autoFocus
        >
          Enter the Tavern
        </button>
        <p className="mt-10 font-mono text-tavern-linen/45 text-[11px] leading-relaxed">
          Best enjoyed with sound on. Click glowing objects to play songs —
          click the room to summon suspiciously fancy beer bottles.
        </p>
      </div>
    </div>
  );
}

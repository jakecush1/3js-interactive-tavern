import { useEffect, useState } from "react";
import { useGameStore } from "../../lib/useGameStore";
import { useIsMobile } from "../../lib/useMedia";

// INTERACTION HINTS
// A small dismissable hint. Auto-hides after the first meaningful
// interaction (song selected or bottles spawned); on phones it also times
// out on its own since it sits over the scene.

export default function InteractionHints() {
  const currentSongId = useGameStore((s) => s.currentSongId);
  const bottleNonce = useGameStore((s) => s.bottleSpawnNonce);
  const scrolledPast = useGameStore((s) => s.scrolledPast);
  const mobile = useIsMobile();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (currentSongId || bottleNonce > 0) {
      const timer = setTimeout(() => setVisible(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [currentSongId, bottleNonce]);

  useEffect(() => {
    if (!mobile) return;
    const timer = setTimeout(() => setVisible(false), 14000);
    return () => clearTimeout(timer);
  }, [mobile]);

  if (!visible || scrolledPast) return null;

  return (
    // Mobile: under the header, full-width band (bottom is the player bar's).
    // sm–lg: bottom band right of the 300px song panel. xl+: true center.
    <div className="pointer-events-none absolute z-30 flex justify-center top-14 left-3 right-3 sm:top-auto sm:bottom-4 sm:left-[336px] sm:right-28 xl:left-1/2 xl:right-auto xl:-translate-x-1/2">
      <div className="placard px-4 py-2 sm:px-5 sm:py-2.5">
        {mobile ? (
          <p className="font-mono text-[10px] text-center tracking-wide">
            Tap <span className="text-tavern-gold font-semibold">glowing objects</span> for songs ·
            tap the <span className="text-tavern-gold font-semibold">room</span> for bottles ·
            swipe <span className="text-tavern-gold font-semibold">up</span> for shows
          </p>
        ) : (
          <p className="font-mono text-[10px] sm:text-xs text-center tracking-wide">
            Click <span className="text-tavern-gold font-semibold">glowing objects</span> to change songs ·
            Click the <span className="text-tavern-gold font-semibold">room</span> to drop beer bottles
          </p>
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import { useGameStore } from "../../lib/useGameStore";
import { audioManager } from "../../lib/audioManager";
import { Volume2, VolumeX, RotateCcw, Menu, X, ArrowUp } from "lucide-react";

// HEADER
// Top overlay: band name, anchor nav, mute toggle, reset camera. On phones
// the nav collapses into a menu button; once the page is scrolled down to
// the band/shows sections the bar gets a solid ground so it stays legible
// over the linen cards, plus a way back up to the tavern.

const navItems = [
  { label: "The Band", target: "about" },
  { label: "Songs", target: "songs" },
  { label: "Shows", target: "shows" },
  { label: "Contact", target: "contact" },
];

export const scrollToTop = () => {
  document.getElementById("app-scroll")?.scrollTo({ top: 0, behavior: "smooth" });
};

export default function Header() {
  const muted = useGameStore((s) => s.muted);
  const toggleMute = useGameStore((s) => s.toggleMute);
  const scrolledPast = useGameStore((s) => s.scrolledPast);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleMute = () => {
    const next = !muted;
    audioManager.setMuted(next);
    toggleMute();
  };

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const backToTavern = () => {
    setMenuOpen(false);
    scrollToTop();
  };

  return (
    <header
      className={`pointer-events-none absolute top-0 inset-x-0 z-40 px-3 sm:px-6 py-3 sm:py-4 transition-colors duration-300 ${
        scrolledPast ? "bg-[#17110b]/92 border-b-2 border-tavern-shadow" : ""
      }`}
    >
      <div className="pointer-events-auto mx-auto max-w-6xl flex items-center justify-between gap-3">
        {/* Brand: a click brings you back up to the tavern */}
        <button
          onClick={backToTavern}
          className="font-medieval gold-text text-lg sm:text-xl font-bold"
          aria-label="Back to the tavern"
        >
          Side Proj
        </button>

        {/* Nav (desktop) */}
        <nav className="hidden md:flex items-center gap-1">
          {scrolledPast && (
            <button
              onClick={backToTavern}
              className="font-mono text-xs uppercase tracking-[0.15em] text-tavern-gold px-3 py-1.5 border-2 border-transparent hover:border-tavern-shadow hover:bg-tavern-gold hover:text-tavern-shadow hover:shadow-brutal-cobalt transition-all flex items-center gap-1.5"
            >
              <ArrowUp size={12} /> Tavern
            </button>
          )}
          {navItems.map((item) => (
            <button
              key={item.target}
              onClick={() => scrollTo(item.target)}
              className="font-mono text-xs uppercase tracking-[0.15em] text-tavern-linen/75 hover:text-tavern-shadow px-3 py-1.5 border-2 border-transparent hover:border-tavern-shadow hover:bg-tavern-gold hover:shadow-brutal-cobalt transition-all"
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.dispatchEvent(new Event("reset-camera"))}
            className="btn-tavern p-2"
            aria-label="Reset camera view"
            title="Reset camera"
          >
            <RotateCcw size={16} />
          </button>
          <button
            onClick={handleMute}
            className="btn-tavern p-2"
            aria-label={muted ? "Unmute audio" : "Mute audio"}
            title={muted ? "Unmute" : "Mute"}
          >
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>

          {/* Menu (phones) */}
          <div className="relative md:hidden">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="btn-tavern p-2"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
            {menuOpen && (
              <nav className="absolute right-0 top-12 w-52 parchment p-1.5 flex flex-col animate-fade-in">
                <button
                  onClick={backToTavern}
                  className="text-left font-medieval text-sm font-bold text-tavern-candle px-3 py-2.5 border-l-4 border-transparent hover:bg-tavern-gold/25 hover:border-tavern-cobalt flex items-center gap-2"
                >
                  <ArrowUp size={13} className="text-tavern-velvet" /> The Tavern
                </button>
                {navItems.map((item) => (
                  <button
                    key={item.target}
                    onClick={() => scrollTo(item.target)}
                    className="text-left font-medieval text-sm font-bold text-tavern-candle px-3 py-2.5 border-l-4 border-transparent hover:bg-tavern-gold/25 hover:border-tavern-cobalt"
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

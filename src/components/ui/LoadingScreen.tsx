// LOADING SCREEN
// Dark gallery-wall style. The copy of this that visitors see first is
// static HTML in index.html (#boot), so it is on screen before any script
// has loaded; keep that markup in step with this. It stays until the room
// is actually built, not for a fixed time. This component is the same
// screen for the rarer moments React has to show it: when Enter was pressed
// and the room is still not ready a beat later.

export default function LoadingScreen() {
  return (
    <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-[#17110b]">
      <h1 className="font-medieval gold-text text-3xl sm:text-4xl font-black mb-6">
        Side Proj
      </h1>
      <div className="w-48 h-2.5 border-2 border-tavern-shadow bg-tavern-linen/10 shadow-brutal-cobalt overflow-hidden mb-5">
        <div className="h-full bg-tavern-gold animate-[fadeIn_1.5s_ease] w-full origin-left" />
      </div>
      <p className="font-mono text-tavern-linen/60 text-xs tracking-wide animate-flicker">
        Tuning lutes… polishing goblets… summoning bottles…
      </p>
    </div>
  );
}

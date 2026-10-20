import { useGameStore } from "../../lib/useGameStore";
import { getBandMember } from "../../data/bandMembers";
import { getSong } from "../../data/songs";
import { X } from "lucide-react";
import Portrait from "./Portrait";

// BAND MEMBER PANEL
// Appears when a member is clicked: top-right on desktop, a sheet above the
// player bar on phones. Shows name, instrument, bio, and live state
// (Playing / Featured). Hidden once the page is scrolled to the content.

export default function BandMemberPanel() {
  const focusedMemberId = useGameStore((s) => s.focusedMemberId);
  const focusMember = useGameStore((s) => s.focusMember);
  const isPlaying = useGameStore((s) => s.isPlaying);
  const currentSongId = useGameStore((s) => s.currentSongId);
  const scrolledPast = useGameStore((s) => s.scrolledPast);

  const member = focusedMemberId ? getBandMember(focusedMemberId) : null;
  if (!member || scrolledPast) return null;

  const song = getSong(currentSongId);
  const state = isPlaying && song ? "Playing" : "Featured";

  return (
    <div className="pointer-events-auto absolute z-40 animate-fade-in inset-x-3 bottom-[4.75rem] md:inset-x-auto md:bottom-auto md:top-20 md:right-4 md:w-[290px]">
      <div className="parchment p-4 md:p-5 max-h-[44vh] md:max-h-[calc(100vh-7rem)] overflow-y-auto tavern-scroll">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            {/* Portrait tile — framed like a tiny gallery piece */}
            <Portrait member={member} className="w-14 h-14" />
            <div>
              <h3 className="font-medieval gold-text text-base font-bold leading-tight">
                {member.name}
              </h3>
              <p className="font-mono text-tavern-cobalt text-[11px] uppercase tracking-wider">
                {member.instrument}
              </p>
            </div>
          </div>
          <button
            onClick={() => focusMember(null)}
            className="text-tavern-candle/50 hover:text-tavern-candle p-1 -m-1"
            aria-label="Close band member info"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-tavern-candle/80 text-sm leading-relaxed italic mb-4">
          “{member.bio}”
        </p>

        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-tavern-stone">
            Status
          </span>
          <span
            className={`font-mono text-[11px] font-medium px-2 py-0.5 border-2 border-tavern-shadow ${
              state === "Playing"
                ? "bg-tavern-moss text-tavern-ice"
                : "bg-tavern-velvet text-tavern-linen"
            }`}
          >
            {state === "Playing" ? `Playing ${song?.title}` : "Featured"}
          </span>
        </div>
      </div>
    </div>
  );
}

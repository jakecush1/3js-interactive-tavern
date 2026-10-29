import { bandMembers } from "../../data/bandMembers";
import { albums, songsByAlbum } from "../../data/songs";
import { upcomingShows } from "../../data/shows";
import { useGameStore } from "../../lib/useGameStore";
import { CalendarDays, ChevronDown, Clock, MapPin, Ticket } from "lucide-react";
import Portrait from "./Portrait";

// FOOTER OVERLAY
// Scrollable content sections that double as the accessible, non-3D fallback:
// band info, song list, shows, contact. Reachable by scrolling or header nav.
// Styled as a dark gallery wall hung with linen placards.

// lucide dropped its brand icons, so the Instagram mark is drawn by hand.
function InstagramGlyph({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
    >
      <rect x="2.5" y="2.5" width="19" height="19" />
      <circle cx="12" cy="12" r="4.5" />
      <line x1="17.25" y1="6.75" x2="17.26" y2="6.75" strokeWidth={2.5} />
    </svg>
  );
}

const INSTAGRAM_URL = "https://www.instagram.com/sidepr0j/";

export default function FooterOverlay() {
  const selectSong = useGameStore((s) => s.selectSong);
  const scrolledPast = useGameStore((s) => s.scrolledPast);
  const memberOpen = useGameStore((s) => s.focusedMemberId !== null);
  const shows = upcomingShows();

  const scrollToContent = () => {
    document.getElementById("about")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      {/* Scroll affordance: a placard chip above the player bar on phones,
          a quiet link bottom-right on desktop; gone once you're down there */}
      {!scrolledPast && (
        <>
          {!memberOpen && (
          <button
            onClick={scrollToContent}
            className="pointer-events-auto fixed right-3 bottom-[4.75rem] z-30 md:hidden placard px-3 py-1.5 flex items-center gap-1.5 font-mono uppercase tracking-wider text-[10px]"
            aria-label="Scroll to band information"
          >
            Band · Shows <ChevronDown size={13} className="animate-bounce" />
          </button>
          )}
          <button
            onClick={scrollToContent}
            className="pointer-events-auto fixed bottom-4 right-4 z-30 hidden md:flex items-center gap-1.5 font-mono uppercase tracking-wider text-tavern-linen/60 hover:text-tavern-gold text-[11px]"
            aria-label="Scroll to band information"
          >
            Learn more <ChevronDown size={14} className="animate-bounce" />
          </button>
        </>
      )}

      {/* Content sections live below the fold (canvas is 100vh) */}
      <div className="pointer-events-auto relative z-20 bg-gradient-to-b from-transparent to-[#17110b]">
        <div
          className="bg-[#17110b]"
          style={{
            // Gallery-wall texture: etching crosshatch over the ebony ground
            backgroundImage:
              "repeating-linear-gradient(45deg, rgba(233,220,190,0.03) 0 1px, transparent 1px 7px), repeating-linear-gradient(-45deg, rgba(0,0,0,0.35) 0 1px, transparent 1px 9px), radial-gradient(ellipse at 50% 0%, rgba(198,138,44,0.07), transparent 60%)",
          }}
        >
          <div className="max-w-4xl mx-auto px-5 sm:px-6 pt-20 pb-28 space-y-20 sm:space-y-24">
            {/* ABOUT */}
            <section id="about" className="scroll-mt-24">
              <p className="font-mono text-tavern-moss text-xs tracking-[0.3em] uppercase mb-3">
                ⌘ The Band
              </p>
              <h2 className="font-medieval gold-text text-3xl sm:text-4xl font-black mb-5">
                Side Proj
              </h2>
              <p className="text-tavern-linen/85 text-lg leading-relaxed max-w-2xl mb-10">
                Side Proj are a wandering renaissance tavern band specializing
                in candlelit jigs, suspicious ballads, and songs best performed near a
                barrel. They have played for kings, peasants, and at least one very
                confused goat.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {bandMembers.map((m) => (
                  <div
                    key={m.id}
                    className="parchment p-4 flex items-start gap-3"
                  >
                    <Portrait member={m} className="w-20 h-20" />
                    <div>
                      <h3 className="font-medieval text-tavern-candle text-base font-bold leading-tight">
                        {m.name}
                      </h3>
                      <p className="font-mono text-tavern-cobalt text-[11px] uppercase tracking-wider mb-1">
                        {m.instrument}
                      </p>
                      <p className="text-tavern-stone text-sm italic leading-snug">
                        {m.bio}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* SONGS */}
            <section id="songs" className="scroll-mt-24">
              <p className="font-mono text-tavern-moss text-xs tracking-[0.3em] uppercase mb-3">
                ♪ The Repertoire
              </p>
              <h2 className="font-medieval gold-text text-3xl font-black mb-8">Songs</h2>
              <div className="space-y-10">
                {albums.map((album) => (
                  <div key={album.id}>
                    <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 mb-4">
                      <h3 className="font-medieval text-tavern-candle text-xl font-bold">
                        {album.title}
                        <span className="font-mono text-tavern-stone text-xs ml-2 tracking-widest">{album.year}</span>
                      </h3>
                      <a
                        href={album.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[11px] uppercase tracking-[0.2em] text-tavern-cobalt hover:text-tavern-gold underline-offset-4 hover:underline"
                      >
                        On Bandcamp ↗
                      </a>
                    </div>
                    <p className="text-tavern-stone text-sm italic mb-4">{album.blurb}</p>
                    <div className="space-y-4">
                      {songsByAlbum(album.id).map((s) => (
                        <div
                          key={s.id}
                          className="parchment p-5 flex flex-col sm:flex-row sm:items-center gap-4"
                        >
                          <div className="flex-1">
                            <h4 className="font-medieval text-tavern-candle text-lg font-bold leading-tight">
                              {s.title}
                            </h4>
                            <p className="text-tavern-stone text-sm mt-1">{s.description}</p>
                          </div>
                          <button
                            onClick={() => selectSong(s.id)}
                            className="btn-tavern font-medieval text-sm px-5 py-2 uppercase shrink-0"
                          >
                            Play
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* SHOWS */}
            <section id="shows" className="scroll-mt-24">
              <p className="font-mono text-tavern-moss text-xs tracking-[0.3em] uppercase mb-3">
                ☗ On the Road
              </p>
              <h2 className="font-medieval gold-text text-3xl font-black mb-6">Shows</h2>

              {shows.length === 0 ? (
                <div className="parchment p-8 text-center">
                  <p className="text-tavern-candle/85 text-lg italic">
                    Upcoming performances coming soon.
                  </p>
                  <p className="font-mono text-tavern-stone text-xs mt-2">
                    The minstrels are currently resting their lutes (and livers).
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {shows.map((show) => (
                    <div key={show.id} className="parchment p-6">
                      <h3 className="font-medieval text-tavern-candle text-xl font-bold leading-tight">
                        {show.venue}
                      </h3>

                      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[11px] uppercase tracking-wider text-tavern-stone">
                        <span className="flex items-center gap-1.5">
                          <CalendarDays size={13} className="text-tavern-velvet" />
                          {show.dateLabel}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock size={13} className="text-tavern-velvet" />
                          {show.timeLabel}
                        </span>
                        {show.admission && (
                          <span className="flex items-center gap-1.5">
                            <Ticket size={13} className="text-tavern-velvet" />
                            {show.admission}
                          </span>
                        )}
                      </div>

                      {/* Venue — the address links out to the map pin */}
                      <div className="mt-4 flex items-start gap-1.5 text-tavern-candle/85">
                        <MapPin size={15} className="text-tavern-velvet mt-0.5 shrink-0" />
                        <p className="text-sm leading-snug">
                          <span className="font-medieval font-bold">{show.place}</span>
                          <br />
                          {show.mapUrl ? (
                            <a
                              href={show.mapUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-xs text-tavern-cobalt underline decoration-2 underline-offset-2 hover:text-tavern-velvet"
                            >
                              {show.address}
                            </a>
                          ) : (
                            <span className="font-mono text-xs text-tavern-stone">
                              {show.address}
                            </span>
                          )}
                        </p>
                      </div>

                      <p className="text-tavern-stone text-sm italic leading-snug mt-4">
                        {show.description}
                        {show.eventHours && ` ${show.eventHours}.`}
                      </p>

                      <div className="mt-5 flex flex-wrap items-center gap-3">
                        {show.infoUrl && (
                          <a
                            href={show.infoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-tavern font-medieval text-sm px-5 py-2 uppercase"
                          >
                            {show.infoLabel ?? "Event Info"}
                          </a>
                        )}
                        {show.updatesUrl && (
                          <a
                            href={show.updatesUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-xs text-tavern-cobalt underline decoration-2 underline-offset-2 hover:text-tavern-velvet"
                          >
                            {show.updatesLabel ?? "Updates on Instagram"}
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* CONTACT */}
            <section id="contact" className="scroll-mt-24">
              <p className="font-mono text-tavern-moss text-xs tracking-[0.3em] uppercase mb-3">
                ✉ Summon Them
              </p>
              <h2 className="font-medieval gold-text text-3xl font-black mb-6">Contact</h2>
              <div className="parchment p-8">
                <p className="text-tavern-candle/85 text-lg mb-6">
                  Bookings, questions, and heckling — send us a message on Instagram.
                </p>

                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-tavern inline-flex items-center gap-3 px-5 py-3"
                  aria-label="Side Proj on Instagram (opens in a new tab)"
                >
                  <InstagramGlyph size={22} />
                  <span className="font-medieval text-sm uppercase tracking-wider">
                    @sidepr0j
                  </span>
                </a>
              </div>
            </section>

            <footer className="text-center font-mono text-tavern-linen/40 text-[11px] tracking-wide pb-8">
              Side Proj · A playful interactive 3D tavern · Built with React
              Three Fiber
            </footer>
          </div>
        </div>
      </div>
    </>
  );
}

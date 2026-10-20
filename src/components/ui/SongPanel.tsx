import { useEffect, useState } from "react";
import { useGameStore } from "../../lib/useGameStore";
import { audioManager } from "../../lib/audioManager";
import { songs, getSong } from "../../data/songs";
import { MOBILE_QUERY } from "../../lib/useMedia";
import { Play, Pause, SkipForward, Music, ChevronUp, ChevronDown } from "lucide-react";

// SONG PANEL
// Bottom-left overlay (full width on phones). Shows now-playing, play/pause,
// next, volume, and the full song list. Drives audioManager and syncs store
// state. Collapsed it becomes a one-line player bar with its own transport,
// which is the default on phones and whenever the page is scrolled down to
// the band/shows sections so the music stays in reach without covering them.

export default function SongPanel() {
  const currentSongId = useGameStore((s) => s.currentSongId);
  const isPlaying = useGameStore((s) => s.isPlaying);
  const volume = useGameStore((s) => s.volume);
  const scrolledPast = useGameStore((s) => s.scrolledPast);
  const selectSong = useGameStore((s) => s.selectSong);
  const nextSong = useGameStore((s) => s.nextSong);
  const setPlaying = useGameStore((s) => s.setPlaying);
  const setVolume = useGameStore((s) => s.setVolume);

  const [collapsed, setCollapsed] = useState(() => window.matchMedia(MOBILE_QUERY).matches);
  const song = getSong(currentSongId);

  // Tuck the panel away when the reader scrolls down to the content.
  useEffect(() => {
    if (scrolledPast) setCollapsed(true);
  }, [scrolledPast]);

  // Sync audio with store changes
  useEffect(() => {
    if (currentSongId && isPlaying) {
      audioManager.play(currentSongId);
    }
  }, [currentSongId, isPlaying]);

  const handlePlayPause = () => {
    if (!currentSongId) {
      // start the first song
      selectSong(songs[0].id);
      return;
    }
    if (isPlaying) {
      audioManager.pause();
      setPlaying(false);
    } else {
      audioManager.resume();
      setPlaying(true);
    }
  };

  const handleVolume = (v: number) => {
    setVolume(v);
    audioManager.setVolume(v);
  };

  return (
    <div className="pointer-events-auto absolute z-40 left-3 right-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] md:left-4 md:right-auto md:bottom-4 md:w-[300px]">
      <div className="parchment overflow-hidden">
        {/* Header bar — doubles as a mini player when collapsed */}
        <div className="flex items-center gap-2 px-3 py-2 border-b-2 border-tavern-shadow bg-tavern-gold/20">
          <Music size={15} className="text-tavern-velvet shrink-0" />
          <div className="min-w-0 flex-1">
            {collapsed && song ? (
              <>
                <p className="font-medieval text-sm font-bold text-tavern-candle truncate leading-tight">
                  {song.title}
                </p>
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-tavern-cobalt leading-tight">
                  {isPlaying ? "▶ Now playing" : "❚❚ Paused"}
                </p>
              </>
            ) : (
              <span className="block truncate font-medieval text-sm font-bold gold-text">Songs of the Tavern</span>
            )}
          </div>
          {collapsed && (
            <>
              <button
                onClick={handlePlayPause}
                className="btn-tavern p-1.5"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              </button>
              <button onClick={nextSong} className="btn-tavern p-1.5" aria-label="Next song">
                <SkipForward size={14} />
              </button>
            </>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-tavern-candle/60 hover:text-tavern-candle p-1"
            aria-label={collapsed ? "Expand song panel" : "Minimize song panel"}
          >
            {collapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {/* Now playing + transport */}
        {!collapsed && (
          <div className="px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-tavern-cobalt mb-0.5">
              {isPlaying ? "▶ Now Playing" : "❚❚ Paused"}
            </p>
            <p className="font-medieval text-tavern-candle text-base leading-tight truncate">
              {song ? song.title : "Nothing yet — pick a tune"}
            </p>
            {song && (
              <p className="font-mono text-tavern-stone text-[11px] mt-0.5 capitalize">
                {song.mood} · {song.bpm} bpm
              </p>
            )}

            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={handlePlayPause}
                className="btn-tavern p-2"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button onClick={nextSong} className="btn-tavern p-2" aria-label="Next song">
                <SkipForward size={16} />
              </button>

              {/* Volume */}
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(e) => handleVolume(parseFloat(e.target.value))}
                className="flex-1 ml-1"
                aria-label="Volume"
              />
            </div>
          </div>
        )}

        {/* Song list */}
        {!collapsed && (
          <div className="border-t-2 border-tavern-shadow max-h-40 md:max-h-44 overflow-y-auto tavern-scroll">
            {songs.map((s) => {
              const active = s.id === currentSongId;
              return (
                <button
                  key={s.id}
                  onClick={() => selectSong(s.id)}
                  className={`w-full text-left px-4 py-2.5 flex items-center gap-2.5 transition-colors border-l-4 ${
                    active
                      ? "bg-tavern-gold/25 border-tavern-cobalt"
                      : "border-transparent hover:bg-tavern-gold/10 hover:border-tavern-velvet"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 shrink-0 ${
                      active && isPlaying ? "bg-tavern-cobalt animate-pulse" : "bg-tavern-candle/30"
                    }`}
                  />
                  <span
                    className={`text-sm truncate ${
                      active ? "text-tavern-candle font-medium" : "text-tavern-candle/70"
                    }`}
                  >
                    {s.title}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

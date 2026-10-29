// SONG DATA
// Every track the band has put on Bandcamp, grouped by album. Audio lives in
// /public/audio/ (the Bandcamp 128k streams for Demos and the live set; the
// four New Normal tracks are the band's own higher-bitrate files). If a file
// is missing, the app logs a console warning and continues (UI + animations
// still run) — see src/lib/audioManager.ts.
//
// `bpm` and `mood` only steer the band's animation and the lighting; the
// values for the newer albums are by ear and easy to tweak here.
//
// To make something in the room start a song, add a clickable object in
// clickableObjects.ts with action "play-song" and the song's id, and put
// that object's id in the song's `triggerObjectId`.

export type SongMood = "warm" | "rowdy" | "mysterious" | "melancholy";

export type AlbumId = "the-new-normal" | "demos" | "live";

export type Album = {
  id: AlbumId;
  title: string;
  year: number;
  url: string;
  blurb: string;
};

export type Song = {
  id: string;
  title: string;
  album: AlbumId;
  file: string;
  mood: SongMood;
  bpm: number;
  triggerObjectId?: string;
  description: string;
};

export const albums: Album[] = [
  {
    id: "the-new-normal",
    title: "The New Normal",
    year: 2026,
    url: "https://sideproject420.bandcamp.com/album/the-new-normal",
    blurb: "The latest: four tunes about serfs, taxes, angels and a woman called Yennifer.",
  },
  {
    id: "demos",
    title: "Demos",
    year: 2025,
    url: "https://sideproject420.bandcamp.com/album/demos",
    blurb: "Rough and ready, recorded before anyone had the sense to stop them.",
  },
  {
    id: "live",
    title: "Live (at Michelle and Everette's)",
    year: 2026,
    url: "https://sideproject420.bandcamp.com/album/live-at-michelle-and-everettes",
    blurb: "A whole set from somebody's living room, hecklers and all.",
  },
];

export const songs: Song[] = [
  // --- The New Normal -------------------------------------------------------
  {
    id: "serfs-and-wenches",
    title: "Serfs and Wenches",
    album: "the-new-normal",
    file: "/audio/1-serfs.mp3",
    mood: "rowdy",
    bpm: 132,
    triggerObjectId: "song-scroll",
    description:
      "A bright, bouncing anthem for the working folk of the realm. Guaranteed to make at least one person attempt to dance on a table.",
  },
  {
    id: "feudal-taxation",
    title: "Feudal Taxation",
    album: "the-new-normal",
    file: "/audio/2-feudal.mp3",
    mood: "melancholy",
    bpm: 76,
    triggerObjectId: "goblet",
    description:
      "A mournful ballad for everyone who owes the lord a portion of the harvest. Slow, sweet, and slightly dramatic.",
  },
  {
    id: "angelic-frick",
    title: "Angelic Frick",
    album: "the-new-normal",
    file: "/audio/3-angelic.mp3",
    mood: "mysterious",
    bpm: 104,
    triggerObjectId: "tapestry",
    description:
      "A hypnotic, moonlit tune that makes the shadows lean in to listen. Best enjoyed while pretending you understand its deeper meaning.",
  },
  {
    id: "yennifer-holepez",
    title: "Yennifer Holepez",
    album: "the-new-normal",
    file: "/audio/4-yennifer.mp3",
    mood: "warm",
    bpm: 118,
    triggerObjectId: "barrel",
    description:
      "A rowdy, gloriously uneven march that speeds up and slows down depending on who's leading. Nobody is leading. That's the point.",
  },

  // --- Demos ----------------------------------------------------------------
  {
    id: "boot-hole",
    title: "Boot Hole",
    album: "demos",
    file: "/audio/demos-01-boot-hole.mp3",
    mood: "rowdy",
    bpm: 120,
    description: "A stomper about the one problem no cobbler in the realm can fix. Mind the puddles.",
  },
  {
    id: "battlejig-of-winterjoan",
    title: "Battlejig of Winterjoan",
    album: "demos",
    file: "/audio/demos-02-battlejig-of-winterjoan.mp3",
    mood: "rowdy",
    bpm: 140,
    description: "The Admiral's war jig, first draft. Fast enough to spill a drink, which is how it was tested.",
  },
  {
    id: "angelic-fuck",
    title: "Angelic Fuck",
    album: "demos",
    file: "/audio/demos-03-angelic-fuck.mp3",
    mood: "mysterious",
    bpm: 104,
    description: "Angelic Frick before the vicar heard it. Same moonlight, fewer manners.",
  },
  {
    id: "forbidden",
    title: "Forbidden",
    album: "demos",
    file: "/audio/demos-04-forbidden.mp3",
    mood: "melancholy",
    bpm: 84,
    description: "A slow one about the things you are not supposed to want, sung by people who wanted them anyway.",
  },
  {
    id: "swamp-jazz",
    title: "Swamp Jazz",
    album: "demos",
    file: "/audio/demos-05-swamp-jazz.mp3",
    mood: "mysterious",
    bpm: 92,
    description: "Five minutes of damp, loose, late-night playing. Something is croaking along in the reeds and it is in tune.",
  },
  {
    id: "sally-sapporo",
    title: "Sally Sapporo",
    album: "demos",
    file: "/audio/demos-06-sally-sapporo.mp3",
    mood: "warm",
    bpm: 112,
    description: "A fond song for a woman from very far away who left a lasting impression and an unpaid tab.",
  },

  // --- Live (at Michelle and Everette's) -----------------------------------
  {
    id: "cereal-aisle",
    title: "Cereal Aisle",
    album: "live",
    file: "/audio/live-01-cereal-aisle.mp3",
    mood: "warm",
    bpm: 116,
    description: "The opener from the living-room set: a love song set somewhere between the oats and the sugary stuff.",
  },
  {
    id: "horse-named-jackson",
    title: "Horse (named Jackson)",
    album: "live",
    file: "/audio/live-02-horse-named-jackson.mp3",
    mood: "rowdy",
    bpm: 124,
    description: "An ode to the horse by the door. He has heard it many times and remains unmoved.",
  },
  {
    id: "crashed-my-boat",
    title: "Crashed my Boat",
    album: "live",
    file: "/audio/live-03-crashed-my-boat.mp3",
    mood: "melancholy",
    bpm: 88,
    description: "The Admiral explains, at last, what happened to the navy career. Nobody comes out of it well, least of all the boat.",
  },
  {
    id: "battlejig-of-winterjone",
    title: "Battlejig of Winterjone",
    album: "live",
    file: "/audio/live-04-battlejig-of-winterjone.mp3",
    mood: "rowdy",
    bpm: 140,
    description: "The war jig again, faster, in front of people, with the spelling nobody could agree on.",
  },
  {
    id: "intermission",
    title: "Intermission",
    album: "live",
    file: "/audio/live-05-intermission.mp3",
    mood: "warm",
    bpm: 100,
    description: "Not actually a break. The band keeps playing while everyone goes to find more drinks.",
  },
  {
    id: "the-high-life",
    title: "The High Life",
    album: "live",
    file: "/audio/live-06-the-high-life.mp3",
    mood: "warm",
    bpm: 108,
    description: "A toast to living well on very little. The chorus is easy enough that the room joined in by the second one.",
  },
  {
    id: "cassandra",
    title: "Cassandra",
    album: "live",
    file: "/audio/live-07-cassandra.mp3",
    mood: "melancholy",
    bpm: 80,
    description: "A long, slow lament for someone who saw it all coming and was ignored, as is traditional.",
  },
  {
    id: "nicky-nicky-9-doors",
    title: "Nicky Nicky 9 Doors",
    album: "live",
    file: "/audio/live-08-nicky-nicky-9-doors.mp3",
    mood: "rowdy",
    bpm: 128,
    description: "Knock, run, repeat. A fast one about childhood crimes, played at the speed of the getaway.",
  },
  {
    id: "amen-ft-shando",
    title: "Amen (ft. Shando)",
    album: "live",
    file: "/audio/live-09-amen-ft-shando.mp3",
    mood: "mysterious",
    bpm: 96,
    description: "The closer: seven and a half minutes with a guest, building from a murmur to something close to a revival.",
  },
];

export const getSong = (id: string | null) =>
  id ? songs.find((s) => s.id === id) ?? null : null;

export const getSongByTrigger = (triggerObjectId: string) =>
  songs.find((s) => s.triggerObjectId === triggerObjectId) ?? null;

export const getAlbum = (id: AlbumId) => albums.find((a) => a.id === id)!;

export const songsByAlbum = (albumId: AlbumId) => songs.filter((s) => s.album === albumId);

// Ambient background loop (optional). Drop a file at this path to enable.
export const AMBIENT_TRACK = "/audio/tavern-ambience.mp3";

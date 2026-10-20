import type { FigureLook } from "../components/characters/Figure";

// BAND MEMBER DATA
// Edit names, bios, instruments, colors, seating positions and the look of
// each 3D figure here. `look` drives the procedural character kit in
// src/components/characters/Figure.tsx and follows the painted character
// sheets in /public/band/sheets. `look.face` is the member's painted head
// cropped from that sheet (/public/band/Heads/*-head.png); the backdrop is
// keyed out automatically and the head is wrapped onto the 3D skull.
// `photo` is the full painted scene render used by the UI portraits.

export type Instrument = "lute" | "fiddle" | "drum" | "flute" | "organ" | "bass";

export type BandMember = {
  id: string;
  name: string;
  instrument: string;
  instrumentType: Instrument;
  bio: string;
  color: string; // signature colour (hover glow, UI accents)
  hatColor: string;
  photo?: string; // portrait in /public/band — drop a jpg at this path
  hairColor?: string;
  look: FigureLook; // 3D body, clothing and face
  position: [number, number, number];
  rotation: [number, number, number];
};

export const bandMembers: BandMember[] = [
  {
    id: "aldric",
    name: "J Hole",
    instrument: "Upright Bass & Vocals",
    instrumentType: "bass",
    bio: "J Hole slaps the upright bass and handles the singing, and insists both sound better after three goblets. No one has verified this scientifically, but no one has disproven it either.",
    color: "#6b4423", // leather harness brown
    hatColor: "#17110b",
    photo: "/band/renders/jhole.jpg",
    // The drunkard (sheet: /public/band/members/Jhole the Drunkard
    // Character Sheet.png): barrel-bellied, bald on top with long brown
    // hair down the back, mustache, cream shirt laced at the throat with a
    // medallion, leather X-strap harness with brass buckles, belt hung with
    // pouches, red cloth at the hip, leather wrist cuffs, olive-brown
    // trousers tucked into tall cuffed boots.
    look: {
      build: "portly",
      skin: "#e8b592",
      face: { url: "/band/Heads/jhole-head.png", back: "#6b3a1e", height: 0.38, keyTolerance: 26 },
      hair: { style: "long", color: "#6b3a1e" },
      outfit: {
        kind: "shirt",
        sleeveColor: "#eee3cb",
        sleeves: "rolled",
        collar: "flat",
        harness: "#4a2e16",
        necklace: "chain",
        belt: true,
        towel: "#7a2630",
        wristCuffs: "#3a2416",
      },
      legs: { hose: "#4a4030", boots: "#4a2e16", bootCuffs: true },
    },
    position: [-2.2, 0, 0.6],
    rotation: [0, 0.6, 0],
  },
  {
    id: "mira",
    name: "Babe Needleman",
    instrument: "Fiddle",
    instrumentType: "fiddle",
    bio: "Babe Needleman saws the fiddle and keeps a banjo and accordion within arm's reach, in case one tune needs all three. Can play any melody you hum, then a better version you didn't ask for.",
    color: "#4e5a30", // tattered green
    hatColor: "#b55a1f", // burnt-orange beanie
    photo: "/band/renders/babe.jpg",
    hairColor: "#c9a35c", // long blonde hair
    // The goblin: long-limbed and hunched, pointed ears and round glasses
    // under the orange beanie, torn green tunic over a white shirt, baldric,
    // belt hung with pouches and trinkets, patched brown trousers, boots.
    look: {
      build: "lanky",
      skin: "#edc7a4",
      face: { url: "/band/Heads/babe-head.png", back: "#b9924e", height: 0.5 },
      outfit: {
        kind: "rags",
        color: "#4e5a30",
        accent: "#3a4424",
        undershirt: "#efe6d2",
        baldric: "#4a2e16",
        necklace: "beads",
        belt: true,
        collar: "none",
      },
      legs: { hose: "#4a3a2c", boots: "#3a2414" },
    },
    position: [-0.8, 0, -1.4],
    rotation: [0, 0.25, 0],
  },
  {
    id: "bram",
    name: "Admiral Joan",
    instrument: "Church Organ & Chain",
    instrumentType: "organ",
    bio: "Admiral Joan left the navy over a 'rhythmic disagreement.' He plays a cathedral organ with one hand, a length of anchor chain with the other, and keeps a flute on the console for emergencies.",
    color: "#1f2a4a", // navy surcoat
    hatColor: "#12888a",
    photo: "/band/renders/admiral.jpg",
    // The knight: dark curls and stubble, navy hooded cloak and scarf, navy
    // surcoat with a gold cross over plate, pauldrons, gauntlets, greaves,
    // gold chain and medallion, baldric and belt.
    look: {
      build: "broad",
      skin: "#dfae86",
      face: { url: "/band/Heads/admiral-head.png", back: "#1a120c", height: 0.5 },
      outfit: {
        kind: "armor",
        color: "#1f2a4a",
        accent: "#c9a24b",
        cloak: "#1b2340",
        collar: "hood",
        necklace: "chain",
        baldric: "#4a2e16",
      },
      legs: { hose: "#2a2d3a", boots: "#2a1a10", greaves: true },
    },
    position: [0.8, 0, -1.4],
    // Faces away from the circle, into the organ, like a proper organist
    rotation: [0, Math.PI - 0.25, 0],
  },
  {
    id: "elowen",
    name: "Freddie Munter",
    instrument: "Lute & Guitar",
    instrumentType: "lute",
    bio: "Freddie Munter picks the lute like a guitar. He claims it was carved from a tree that 'remembered every song it ever heard,' and is suspiciously good at proving it.",
    color: "#6e4a2a", // leather apron
    hatColor: "#2e2018",
    photo: "/band/renders/freddie.jpg",
    // The craftsman: black knit cap over brown curls, mustache, cream shirt
    // with the sleeves rolled, brown leather bib apron on buckled straps,
    // belt with a towel, fingerless gloves, dark trousers, laced boots.
    look: {
      build: "stout",
      skin: "#e3b28c",
      face: { url: "/band/Heads/freddie-head.png", back: "#17110b", height: 0.46 },
      outfit: {
        kind: "shirt",
        sleeveColor: "#f0e8d8",
        sleeves: "rolled",
        collar: "flat",
        apron: "#6e4a2a",
        suspenders: "#4a2e16",
        belt: true,
        towel: true,
      },
      gloves: "#3a2a1c",
      legs: { hose: "#3a2f26", boots: "#3b2614" },
    },
    position: [2.2, 0, 0.6],
    rotation: [0, -0.6, 0],
  },
];

export const getBandMember = (id: string) =>
  bandMembers.find((m) => m.id === id);

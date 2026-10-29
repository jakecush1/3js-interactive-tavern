// CLICKABLE OBJECT DATA
// Each object lives somewhere in the scene and triggers an action when clicked.
// - "play-song": starts the song with the matching songId
// - "spawn-bottle": drops beer bottles
// - "show-info": reserved for future use
//
// Positions are [x, y, z] in scene units. Adjust to reposition props.

export type ClickableAction = "play-song" | "show-info" | "spawn-bottle";

export type ClickableObjectKind =
  | "scroll"
  | "goblet"
  | "barrel"
  | "keg"
  | "coinbag"
  | "bread"
  | "candle";

export type ClickableObject = {
  id: string;
  label: string;
  action: ClickableAction;
  songId?: string;
  kind: ClickableObjectKind;
  position: [number, number, number];
  scale?: number;
};

export const clickableObjects: ClickableObject[] = [
  {
    // Pile of rustic loaves on the ground in front of J Hole — peasant fare
    id: "bread-loaf",
    label: "Play Serfs and Wenches",
    action: "play-song",
    songId: "serfs-and-wenches",
    kind: "bread",
    position: [-1.65, 0, 1.35],
  },
  {
    // Bag of gold coins on the central table — taxes, presumably
    id: "coin-bag",
    label: "Play Feudal Taxation",
    action: "play-song",
    songId: "feudal-taxation",
    kind: "coinbag",
    position: [0.0, 0.5, 1.9],
  },
  // NOTE: "Angelic Frick" is triggered by clicking the barmaid (see
  // src/components/Barmaid.tsx), not a static object in this list.
  {
    // Giant old-style mead keg on an oak stand behind Admiral Joan, clear of
    // his piano and tucked inside the barmaid's round (see Barmaid.tsx)
    id: "mead-keg",
    label: "Play Yennifer Holepez",
    action: "play-song",
    songId: "yennifer-holepez",
    kind: "keg",
    position: [3.05, 0.0, -1.45],
  },
];

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/globals.css";
import App from "./App";

// The start screen and the panels use faces the loading screen does not.
// Ask for them now, while the room is being built, so the text does not
// appear in a fallback face and then change.
for (const font of ['italic 1em "EB Garamond"', '1em "EB Garamond"', '500 1em "IBM Plex Mono"', '600 1em "IBM Plex Mono"']) {
  document.fonts?.load(font).catch(() => {});
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

import { useEffect, useState } from "react";

// Small matchMedia hook for layout decisions the CSS breakpoints can't make
// on their own (we care about short landscape phones as well as narrow ones).

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

// Phones in either orientation: compact overlays, lighter rendering.
export const MOBILE_QUERY = "(max-width: 767px), (max-height: 520px)";
export const useIsMobile = () => useMediaQuery(MOBILE_QUERY);

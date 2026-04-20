import { useEffect, useState } from "react";

/**
 * Returns true when the given media query matches.
 * SSR-safe: defaults to false until mounted.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(query);
    setMatches(mq.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

/** Convenience hooks for the canonical breakpoints */
export const useIsMobileXs = () => useMediaQuery("(max-width: 639px)");
export const useIsMobileSm = () => useMediaQuery("(max-width: 767px)");
export const useIsTablet   = () => useMediaQuery("(min-width: 768px) and (max-width: 1023px)");
export const useIsDesktop  = () => useMediaQuery("(min-width: 1024px)");

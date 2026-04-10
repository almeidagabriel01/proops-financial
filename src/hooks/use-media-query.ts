'use client';

import { useEffect, useState } from 'react';

/**
 * SSR-safe hook that listens to a CSS media query.
 * Returns false during SSR/hydration, resolves on mount.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    queueMicrotask(() => setMatches(mediaQuery.matches));

    const handler = (event: MediaQueryListEvent) => setMatches(event.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

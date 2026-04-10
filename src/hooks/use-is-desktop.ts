'use client';

import { useMediaQuery } from '@/hooks/use-media-query';

/**
 * Returns true when viewport is >= 1024px (desktop breakpoint).
 * Returns false during SSR to default to mobile layout.
 */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}

import { useSyncExternalStore } from 'react';

export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', cb);
      return () => mql.removeEventListener('change', cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Desktop shell (sidebar) from 1024px, as in the Central do Organizador design. */
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)');

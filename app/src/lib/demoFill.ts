import { useEffect, useRef } from 'react';
import { create } from 'zustand';

/**
 * "Preencher dados fictícios": a screen with a form registers a filler while
 * mounted, and the Dev panel exposes a button that runs it.
 */
interface DemoFillState {
  filler: (() => void) | null;
  set: (f: (() => void) | null) => void;
}

export const useDemoFillStore = create<DemoFillState>((set) => ({ filler: null, set: (filler) => set({ filler }) }));

export function useDemoFill(fill: () => void) {
  const ref = useRef(fill);
  ref.current = fill;
  useEffect(() => {
    const run = () => ref.current();
    useDemoFillStore.getState().set(run);
    return () => {
      if (useDemoFillStore.getState().filler === run) useDemoFillStore.getState().set(null);
    };
  }, []);
}

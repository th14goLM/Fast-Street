import { useEffect, useState } from 'react';
import { create } from 'zustand';

/**
 * Simulated network conditions. The prototypes expose every screen state
 * (loading, error with retry, offline cache); the app reaches them through
 * this switch, driven by the Dev panel or by `?net=` in the URL.
 */
export type NetworkMode = 'online' | 'slow' | 'error' | 'offline';

interface NetworkState {
  mode: NetworkMode;
  /** Bumped on every mode change so cached loads are discarded. */
  epoch: number;
  /** QA: the last spots are taken while the pilot reviews a registration (UC-05 "vagas esgotadas"). */
  raceSoldOut: boolean;
  setMode: (mode: NetworkMode) => void;
  setRaceSoldOut: (v: boolean) => void;
}

const initialMode = (): NetworkMode => {
  if (typeof location === 'undefined') return 'online';
  const q = new URLSearchParams(location.search).get('net');
  return q === 'slow' || q === 'error' || q === 'offline' ? q : 'online';
};

export const useNetwork = create<NetworkState>((set) => ({
  mode: initialMode(),
  epoch: 0,
  raceSoldOut: false,
  setRaceSoldOut: (raceSoldOut) => set({ raceSoldOut }),
  setMode: (mode) => {
    loaded.clear();
    set((s) => ({ mode, epoch: s.epoch + 1 }));
  },
}));

const LATENCY: Record<NetworkMode, number> = { online: 450, slow: 1800, error: 450, offline: 120 };

/** Resources already fetched this session, so tab switches don't flash skeletons. */
const loaded = new Set<string>();

export type LoadStatus = 'loading' | 'error' | 'ready';

export interface LoadState {
  status: LoadStatus;
  /** Data is being served from the local cache (offline mode). */
  offline: boolean;
  retry: () => void;
}

/**
 * Loading gate for a resource. Data itself lives in the stores; this hook
 * only models the request lifecycle. In "error" mode the first attempt fails
 * and "Tentar novamente" succeeds, as in the prototypes.
 */
export function useLoad(key: string): LoadState {
  const { mode, epoch } = useNetwork();
  const [attempt, setAttempt] = useState(0);
  const cached = loaded.has(key) && attempt === 0;
  const [status, setStatus] = useState<LoadStatus>(cached ? 'ready' : 'loading');

  useEffect(() => {
    if (loaded.has(key) && attempt === 0) {
      setStatus('ready');
      return;
    }
    setStatus('loading');
    const t = setTimeout(() => {
      if (mode === 'error' && attempt === 0) return setStatus('error');
      loaded.add(key);
      setStatus('ready');
    }, LATENCY[mode]);
    return () => clearTimeout(t);
  }, [key, mode, epoch, attempt]);

  return { status, offline: mode === 'offline', retry: () => setAttempt((a) => a + 1) };
}

export const isOffline = () => useNetwork.getState().mode === 'offline';

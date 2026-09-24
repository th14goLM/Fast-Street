import { useEffect, useRef, useState } from 'react';
import { useNetwork } from './network';
import { fileToDataUrl } from '@/ui/ImageSlot';

export type UploadStatus = 'up' | 'done' | 'err';

export interface UploadItem {
  key: string;
  /** Preview (data URL) of the chosen file; absent for pre-existing/demo photos. */
  url?: string;
  status: UploadStatus;
  progress: number;
  /** When true the current attempt fails midway (simulated network error). */
  fail?: boolean;
}

let seq = 0;
const nextKey = () => `ph${++seq}`;

/**
 * Simulated per-photo upload with individual progress, as designed for UC-01:
 * a failed photo shows "Tentar novamente" without losing the form. Failures
 * come from the simulated network: offline fails every upload, "erro" fails
 * the second photo on its first attempt.
 */
export function usePhotoUploads(initial: UploadItem[] = []) {
  const [items, setItems] = useState<UploadItem[]>(initial);
  const mode = useNetwork((s) => s.mode);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const uploading = items.some((i) => i.status === 'up');
  useEffect(() => {
    if (!uploading) return;
    const iv = setInterval(() => {
      setItems((list) =>
        list.map((p) => {
          if (p.status !== 'up') return p;
          const n = p.progress + 9 + Math.random() * 10;
          if (p.fail && n > 55) return { ...p, status: 'err', progress: 0, fail: false };
          return n >= 100 ? { ...p, status: 'done', progress: 100 } : { ...p, progress: n };
        }),
      );
    }, 200);
    return () => clearInterval(iv);
  }, [uploading]);

  const shouldFail = (index: number) => modeRef.current === 'offline' || (modeRef.current === 'error' && index === 1);

  const addFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
    for (const file of list) {
      const url = await fileToDataUrl(file).catch(() => undefined);
      setItems((cur) => (cur.length >= 6 ? cur : [...cur, { key: nextKey(), url, status: 'up', progress: 0, fail: shouldFail(cur.length) }]));
    }
  };

  /** Adds a photo without a file (used by "Preencher dados fictícios"). */
  const addPlaceholder = () => setItems((cur) => (cur.length >= 6 ? cur : [...cur, { key: nextKey(), status: 'up', progress: 0, fail: shouldFail(cur.length) }]));

  const retry = (key: string) => setItems((cur) => cur.map((p) => (p.key === key ? { ...p, status: 'up', progress: 0, fail: modeRef.current === 'offline' } : p)));
  const remove = (key: string) => setItems((cur) => cur.filter((p) => p.key !== key));
  const reset = (next: UploadItem[]) => setItems(next);

  return {
    items,
    done: items.filter((i) => i.status === 'done').length,
    hasError: items.some((i) => i.status === 'err'),
    addFiles,
    addPlaceholder,
    retry,
    remove,
    reset,
  };
}

export const donePhotos = (n: number): UploadItem[] => Array.from({ length: n }, () => ({ key: nextKey(), status: 'done', progress: 100 }));

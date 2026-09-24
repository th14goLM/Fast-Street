import { useRef, useState, type DragEvent } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { Icon } from './Icon';
import { cx } from '@/lib/cx';

/**
 * Image slots keep the prototype's "drop a photo here" behaviour: until real
 * media comes from an API, anyone reviewing the app can drag a picture onto
 * a slot (or click it) and it is kept on this device.
 */
interface ImageStore {
  images: Record<string, string>;
  set: (id: string, dataUrl: string) => void;
  clear: (id: string) => void;
}

export const useImages = create<ImageStore>()(
  persist(
    (set) => ({
      images: {},
      set: (id, dataUrl) => set((s) => ({ images: { ...s.images, [id]: dataUrl } })),
      clear: (id) =>
        set((s) => {
          const images = { ...s.images };
          delete images[id];
          return { images };
        }),
    }),
    { name: 'fast-street:images', storage: createJSONStorage(() => localStorage) },
  ),
);

const MAX_SIDE = 1200;

/** Downscales to keep localStorage usage reasonable. */
export async function fileToDataUrl(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

interface ImageSlotProps {
  id: string;
  placeholder?: string;
  shape?: 'rect' | 'circle';
  /** Accept a dropped image. Defaults to true. */
  editable?: boolean;
  /** Also open the file picker on click (off inside clickable cards). */
  pick?: boolean;
  src?: string;
  alt?: string;
}

export function ImageSlot({ id, placeholder = 'Arraste uma imagem', shape = 'rect', editable = true, pick = false, src, alt = '' }: ImageSlotProps) {
  const stored = useImages((s) => s.images[id]);
  const { set, clear } = useImages.getState();
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const image = src ?? stored;

  const accept = async (file?: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    try {
      set(id, await fileToDataUrl(file));
    } catch {
      /* unreadable image: keep the placeholder */
    }
  };

  const dnd = editable
    ? {
        onDragOver: (e: DragEvent) => {
          e.preventDefault();
          setOver(true);
        },
        onDragLeave: () => setOver(false),
        onDrop: (e: DragEvent) => {
          e.preventDefault();
          setOver(false);
          accept(e.dataTransfer.files?.[0]);
        },
      }
    : {};

  return (
    <div className={cx('fs-slot', shape === 'circle' && 'fs-slot--circle', over && 'fs-slot--over', editable && pick && !image && 'fs-slot--editable')} {...dnd}>
      {image ? (
        <>
          <img src={image} alt={alt} draggable={false} />
          {editable && stored && !src && (
            <button
              type="button"
              className="fs-slot__clear"
              onClick={(e) => {
                e.stopPropagation();
                clear(id);
              }}
            >
              Remover
            </button>
          )}
        </>
      ) : (
        <div
          className="fs-slot__empty"
          onClick={
            editable && pick
              ? (e) => {
                  e.stopPropagation();
                  input.current?.click();
                }
              : undefined
          }
        >
          {placeholder.trim() && shape !== 'circle' && <Icon name="image" />}
          {placeholder.trim() && <span>{placeholder}</span>}
          <span className="fs-slot__ring" />
        </div>
      )}
      {editable && <input ref={input} type="file" accept="image/*" hidden onChange={(e) => accept(e.target.files?.[0])} />}
    </div>
  );
}

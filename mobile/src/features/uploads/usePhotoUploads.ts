import { useCallback, useRef, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { prepareImage } from '../../lib/image';
import { uploadImage, type Finalidade } from '../../lib/upload';

export type PhotoStatus = 'preparing' | 'uploading' | 'done' | 'error';

export interface Photo {
  key: string;
  /** Imagem local, mostrada na hora (antes mesmo do envio terminar). */
  localUri: string;
  originalWidth: number;
  status: PhotoStatus;
  progress: number;
  uploadId?: string;
  error?: string;
}

let seq = 0;

/**
 * Upload individual de fotos (RN-VEI-02): cada foto é preparada (≤ 1024 KB) e enviada
 * assim que escolhida, com progresso e "Tentar novamente" próprios. O formulário não
 * depende disso para manter o que já foi digitado.
 */
export function usePhotoUploads(finalidade: Finalidade, max: number) {
  const { withToken } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const removed = useRef(new Set<string>());

  const patch = useCallback((key: string, p: Partial<Photo>) => {
    if (removed.current.has(key)) return;
    setPhotos((list) => list.map((x) => (x.key === key ? { ...x, ...p } : x)));
  }, []);

  const send = useCallback(
    async (photo: Photo) => {
      patch(photo.key, { status: 'preparing', progress: 0, error: undefined });
      try {
        const prepared = await prepareImage(photo.localUri, photo.originalWidth);
        patch(photo.key, { status: 'uploading' });
        const { id } = await withToken((token) => uploadImage(prepared.uri, finalidade, token, (f) => patch(photo.key, { progress: f })));
        patch(photo.key, { status: 'done', progress: 1, uploadId: id });
      } catch (err) {
        patch(photo.key, { status: 'error', error: err instanceof Error ? err.message : 'Falha no envio.' });
      }
    },
    [finalidade, patch, withToken],
  );

  /** Abre a galeria. Retorna false se o usuário cancelar. */
  const pick = useCallback(async () => {
    const remaining = max - photos.length;
    if (remaining <= 0) return false;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: remaining > 1,
      selectionLimit: remaining,
      quality: 1,
    });
    if (result.canceled) return false;
    const added: Photo[] = result.assets.slice(0, remaining).map((a) => ({
      key: `p${++seq}`,
      localUri: a.uri,
      originalWidth: a.width,
      status: 'preparing',
      progress: 0,
    }));
    setPhotos((list) => [...list, ...added]);
    added.forEach((p) => void send(p));
    return true;
  }, [max, photos.length, send]);

  const retry = useCallback((key: string) => {
    const photo = photos.find((p) => p.key === key);
    if (photo) void send(photo);
  }, [photos, send]);

  const remove = useCallback((key: string) => {
    removed.current.add(key);
    setPhotos((list) => list.filter((p) => p.key !== key));
  }, []);

  const done = photos.filter((p) => p.status === 'done');
  return {
    photos,
    pick,
    retry,
    remove,
    doneCount: done.length,
    uploadIds: done.map((p) => p.uploadId!),
    busy: photos.some((p) => p.status === 'preparing' || p.status === 'uploading'),
    errorCount: photos.filter((p) => p.status === 'error').length,
  };
}

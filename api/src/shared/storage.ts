import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';

/**
 * Armazenamento de imagens em disco local (decisão do MVP). A interface é pequena de
 * propósito: para usar S3/Cloudinary, troque `saveImage` e `mediaUrl` e mantenha o resto.
 */
export const UPLOAD_ROOT = path.resolve(process.cwd(), env.UPLOAD_DIR);
export const MEDIA_PREFIX = '/media';
export const MAX_IMAGE_BYTES = 1024 * 1024; // 1024 KB (RN-VEI-02)

export type ImageMime = 'image/png' | 'image/jpeg';

/** Identifica PNG/JPEG pela assinatura do arquivo; não confia no tipo informado pelo cliente. */
export function detectImageMime(buf: Buffer): ImageMime | null {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  return null;
}

/** Grava em <UPLOAD_ROOT>/<ano>/<mês>/<uuid>.<ext> e devolve o caminho relativo. */
export async function saveImage(buf: Buffer, mime: ImageMime): Promise<string> {
  const now = new Date();
  const dir = path.join(String(now.getUTCFullYear()), String(now.getUTCMonth() + 1).padStart(2, '0'));
  const name = `${randomUUID()}.${mime === 'image/png' ? 'png' : 'jpg'}`;
  await mkdir(path.join(UPLOAD_ROOT, dir), { recursive: true });
  await writeFile(path.join(UPLOAD_ROOT, dir, name), buf, { flag: 'wx' });
  return path.posix.join(dir.split(path.sep).join('/'), name);
}

export const mediaUrl = (caminho: string): string => `${env.PUBLIC_API_URL.replace(/\/$/, '')}${MEDIA_PREFIX}/${caminho}`;

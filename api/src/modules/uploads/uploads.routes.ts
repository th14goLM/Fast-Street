import { randomUUID } from 'node:crypto';
import { Router, type RequestHandler } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { pool } from '../../db/pool.js';
import { AppError } from '../../shared/errors.js';
import { requireAuth } from '../../shared/http/require-auth.js';
import { detectImageMime, MAX_IMAGE_BYTES, mediaUrl, saveImage } from '../../shared/storage.js';

const Query = z.object({ finalidade: z.enum(['foto_perfil', 'foto_veiculo'], { error: 'Finalidade inválida.' }) });

const memory = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 0 } });

/** Recebe um único arquivo no campo "arquivo" e traduz os erros do multer para o padrão da API. */
const singleImage: RequestHandler = (req, res, next) =>
  memory.single('arquivo')(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError(413, 'FILE_TOO_LARGE', 'A imagem passa de 1024 KB. Escolha outra ou reduza o tamanho.'));
    }
    if (err instanceof multer.MulterError) return next(new AppError(400, 'BAD_UPLOAD', 'Envie uma única imagem no campo "arquivo".'));
    next(err as Error | undefined);
  });

/**
 * POST /uploads?finalidade=foto_perfil|foto_veiculo (multipart, campo "arquivo").
 * Upload individual, antes do formulário ser salvo: cada foto tem progresso e
 * "Tentar novamente" próprios (RN-VEI-02). Aceita só PNG/JPEG até 1024 KB.
 */
export function uploadsRoutes(): Router {
  const router = Router();
  router.post('/', requireAuth, singleImage, async (req, res) => {
    const { finalidade } = Query.parse(req.query);
    if (!req.file) throw new AppError(422, 'VALIDATION_ERROR', 'Envie uma imagem.', { arquivo: 'Envie uma imagem.' });
    const mime = detectImageMime(req.file.buffer);
    if (!mime) throw new AppError(415, 'UNSUPPORTED_TYPE', 'Formato não aceito. Use PNG, JPG ou JPEG.');

    const caminho = await saveImage(req.file.buffer, mime);
    const id = randomUUID();
    await pool.query(
      'INSERT INTO upload (id, usuario_id, finalidade, caminho, mime, tamanho_bytes) VALUES (?, ?, ?, ?, ?, ?)',
      [id, req.auth!.sub, finalidade, caminho, mime, req.file.size],
    );
    res.status(201).json({ id, url: mediaUrl(caminho), tamanhoBytes: req.file.size });
  });
  return router;
}

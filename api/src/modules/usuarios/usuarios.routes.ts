import { Router } from 'express';
import type { ResultSetHeader } from 'mysql2/promise';
import { z } from 'zod';
import { pool, withTransaction } from '../../db/pool.js';
import { AppError } from '../../shared/errors.js';
import { requireAuth } from '../../shared/http/require-auth.js';
import { findUsuarioById } from '../auth/auth.repository.js';
import { toDTO } from '../auth/auth.service.js';

/** Texto opcional: "" ou só espaços vira null (limpa o campo). */
const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((v) => v || null)
    .nullable()
    .optional();

/** UC-16 · Dados opcionais (RN-PER-01/02). Todos os campos são opcionais e parciais. */
export const PerfilSchema = z.object({
  bio: optionalText(160, 'A bio pode ter no máximo 160 caracteres.'),
  instagram: optionalText(31, 'Use apenas letras, números, ponto ou _ (ex.: @seuperfil).')
    .refine((v) => !v || /^@?[A-Za-z0-9._]{2,30}$/.test(v), 'Use apenas letras, números, ponto ou _ (ex.: @seuperfil).')
    .transform((v) => (v && !v.startsWith('@') ? `@${v}` : v)),
  youtube: optionalText(255, 'Link muito longo.').refine(
    (v) => !v || /(^|\/\/|\.)(youtube\.com\/|youtu\.be\/)/i.test(v),
    'Use um link do YouTube (youtube.com/@canal).',
  ),
  fotoUploadId: z.uuid('Foto inválida.').nullable().optional(),
});

export function usuariosRoutes(): Router {
  const router = Router();

  router.patch('/me', requireAuth, async (req, res) => {
    const input = PerfilSchema.parse(req.body ?? {});
    const usuarioId = req.auth!.sub;

    await withTransaction(async (tx) => {
      if (input.fotoUploadId) {
        const [r] = await tx.query<ResultSetHeader>(
          `UPDATE upload SET usado_em = COALESCE(usado_em, UTC_TIMESTAMP(3))
            WHERE id = ? AND usuario_id = ? AND finalidade = 'foto_perfil'`,
          [input.fotoUploadId, usuarioId],
        );
        if (r.affectedRows === 0) {
          throw new AppError(422, 'VALIDATION_ERROR', 'Revise 1 campo destacado.', { fotoUploadId: 'Foto não encontrada. Envie de novo.' });
        }
      }
      const sets: string[] = [];
      const values: unknown[] = [];
      const add = (col: string, v: unknown) => {
        sets.push(`${col} = ?`);
        values.push(v);
      };
      if (input.bio !== undefined) add('bio', input.bio);
      if (input.instagram !== undefined) add('instagram', input.instagram);
      if (input.youtube !== undefined) add('youtube_url', input.youtube);
      if (input.fotoUploadId !== undefined) add('foto_upload_id', input.fotoUploadId);
      if (sets.length) await tx.query(`UPDATE usuario SET ${sets.join(', ')} WHERE id = ?`, [...values, usuarioId]);
    });

    const usuario = await findUsuarioById(pool, usuarioId);
    if (!usuario) throw new AppError(401, 'UNAUTHORIZED', 'Sessão inválida ou expirada.');
    res.json({ usuario: toDTO(usuario) });
  });

  return router;
}

import { Router } from 'express';
import type { RowDataPacket } from 'mysql2/promise';
import { pool } from '../../db/pool.js';

export function cidadesRoutes(): Router {
  const router = Router();
  router.get('/', async (_req, res) => {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id, nome, uf FROM cidade WHERE ativa = 1 ORDER BY nome',
    );
    res.set('Cache-Control', 'public, max-age=3600').json({ cidades: rows });
  });
  return router;
}

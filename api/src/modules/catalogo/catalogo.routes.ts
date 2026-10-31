import { Router } from 'express';
import type { RowDataPacket } from 'mysql2/promise';
import { pool } from '../../db/pool.js';

/** GET /catalogo/veiculos: marcas e categorias para o cadastro de veículo (listas fechadas). */
export function catalogoRoutes(): Router {
  const router = Router();
  router.get('/veiculos', async (_req, res) => {
    const [marcas] = await pool.query<RowDataPacket[]>('SELECT id, nome FROM marca WHERE ativa = 1 ORDER BY nome');
    const [categorias] = await pool.query<RowDataPacket[]>('SELECT id, nome FROM categoria ORDER BY ordem');
    res.set('Cache-Control', 'public, max-age=3600').json({ marcas, categorias });
  });
  return router;
}

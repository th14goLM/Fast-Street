import { pool } from '../src/db/pool.js';

/** Limpa os dados de usuário respeitando as FKs (as tabelas de catálogo ficam). */
export async function resetDb(): Promise<void> {
  await pool.query('DELETE FROM foto_veiculo');
  await pool.query('DELETE FROM veiculo');
  await pool.query('UPDATE usuario SET foto_upload_id = NULL');
  for (const t of ['upload', 'sessao', 'token_autenticacao', 'organizador', 'usuario']) await pool.query(`DELETE FROM ${t}`);
}

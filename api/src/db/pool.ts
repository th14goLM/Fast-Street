import mysql, { type Pool, type PoolConnection } from 'mysql2/promise';
import { env } from '../config/env.js';

export const pool: Pool = mysql.createPool({
  uri: env.DATABASE_URL,
  connectionLimit: 10,
  // Datas sempre em UTC; a conversão para America/Sao_Paulo é feita no app.
  timezone: 'Z',
  dateStrings: false,
  namedPlaceholders: true,
});

/** Executa `fn` dentro de uma transação, com commit/rollback automáticos. */
export async function withTransaction<T>(fn: (conn: PoolConnection) => Promise<T>): Promise<T> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

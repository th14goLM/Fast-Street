/**
 * Runner mínimo de migrations em SQL puro.
 * Aplica, em ordem alfabética, os arquivos de `src/db/migrations` ainda não
 * registrados na tabela `schema_migrations`.
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

export async function migrate(databaseUrl = env.DATABASE_URL, log = console.log): Promise<void> {
  const conn = await mysql.createConnection({ uri: databaseUrl, multipleStatements: true });
  try {
    await conn.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      nome VARCHAR(255) PRIMARY KEY,
      aplicada_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    )`);
    const [rows] = await conn.query<mysql.RowDataPacket[]>('SELECT nome FROM schema_migrations');
    const applied = new Set(rows.map((r) => r.nome as string));
    const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();

    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = await readFile(path.join(dir, file), 'utf8');
      log(`→ aplicando ${file}`);
      // DDL no MySQL faz commit implícito; cada arquivo deve ser idempotente o bastante
      // para ser reaplicado manualmente em caso de falha no meio.
      await conn.query(sql);
      await conn.query('INSERT INTO schema_migrations (nome) VALUES (?)', [file]);
    }
    log('Migrations em dia.');
  } finally {
    await conn.end();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  migrate().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

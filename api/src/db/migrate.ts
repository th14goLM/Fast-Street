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
import { applyLockTimeout, explainLockTimeout, isLockTimeout } from './lock.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

/**
 * Cria o banco do DATABASE_URL se ainda não existir (comum em máquina nova).
 * Conecta sem banco selecionado; o usuário precisa de permissão CREATE.
 */
function databaseName(databaseUrl: string): string {
  const name = decodeURIComponent(new URL(databaseUrl).pathname.replace(/^\//, ''));
  if (!/^[A-Za-z0-9_]+$/.test(name)) throw new Error(`Nome de banco inválido no DATABASE_URL: "${name}"`);
  return name;
}

async function ensureDatabase(databaseUrl: string, log: (msg: string) => void): Promise<void> {
  const name = databaseName(databaseUrl);
  const url = new URL(databaseUrl);
  url.pathname = '/';
  const conn = await mysql.createConnection({ uri: url.toString() });
  try {
    const [rows] = await conn.query<mysql.RowDataPacket[]>('SHOW DATABASES LIKE ?', [name]);
    if (rows.length) return;
    await conn.query(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`);
    log(`→ banco ${name} criado`);
  } finally {
    await conn.end();
  }
}

export async function migrate(databaseUrl = env.DATABASE_URL, log = console.log, lockWaitTimeout = env.DB_LOCK_WAIT_TIMEOUT): Promise<void> {
  await ensureDatabase(databaseUrl, log);
  const conn = await mysql.createConnection({ uri: databaseUrl, multipleStatements: true });
  let file = 'schema_migrations';
  try {
    await applyLockTimeout(conn, lockWaitTimeout);
    await conn.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      nome VARCHAR(255) PRIMARY KEY,
      aplicada_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    )`);
    const [rows] = await conn.query<mysql.RowDataPacket[]>('SELECT nome FROM schema_migrations');
    const applied = new Set(rows.map((r) => r.nome as string));
    const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();

    for (file of files) {
      if (applied.has(file)) continue;
      const sql = await readFile(path.join(dir, file), 'utf8');
      log(`→ aplicando ${file}`);
      // DDL no MySQL faz commit implícito; cada arquivo deve ser idempotente o bastante
      // para ser reaplicado manualmente em caso de falha no meio.
      try {
        await conn.query(sql);
      } catch (err) {
        if (isLockTimeout(err)) throw err;
        const e = err as { code?: string; sqlMessage?: string };
        throw new Error(`Falha em ${file}: ${e.sqlMessage ?? String(err)} (${e.code ?? 'sem código'})`, { cause: err });
      }
      await conn.query('INSERT INTO schema_migrations (nome) VALUES (?)', [file]);
    }
    log('Migrations em dia.');
  } catch (err) {
    if (!isLockTimeout(err)) throw err;
    const explicacao = await explainLockTimeout(conn, databaseName(databaseUrl), lockWaitTimeout);
    throw new Error(`Falha em ${file}: ${explicacao}`, { cause: err });
  } finally {
    await conn.end();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  migrate().catch((err: Error) => {
    console.error(err.message);
    process.exit(1);
  });
}

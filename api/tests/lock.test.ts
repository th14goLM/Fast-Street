import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import mysql from 'mysql2/promise';
import { pool } from '../src/db/pool.js';
import { isLockTimeout } from '../src/db/lock.js';
import { migrate } from '../src/db/migrate.js';

const url = process.env.DATABASE_URL!;

beforeAll(async () => {
  await migrate(url, () => {});
});

afterAll(async () => {
  // Deixa o banco de teste como os outros arquivos esperam.
  await migrate(url, () => {});
  await pool.end();
});

describe('migrate com bloqueio (lock)', () => {
  it('desiste no tempo configurado e explica o bloqueio, em vez de travar', async () => {
    // Simula a 004 ainda não aplicada.
    for (const t of ['inscricao', 'evento_categoria', 'evento', 'local']) await pool.query(`DROP TABLE IF EXISTS ${t}`);
    await pool.query("DELETE FROM schema_migrations WHERE nome = '004_eventos.sql'");

    // "Aba do Workbench" com transação aberta que leu a tabela veiculo (referenciada pela inscricao).
    const workbench = await mysql.createConnection({ uri: url });
    try {
      await workbench.beginTransaction();
      await workbench.query('SELECT * FROM veiculo LIMIT 1');

      const inicio = Date.now();
      const err = await migrate(url, () => {}, 1).then(
        () => null,
        (e: Error) => e,
      );
      expect(Date.now() - inicio).toBeLessThan(10_000);
      expect(err).toBeInstanceOf(Error);
      expect(isLockTimeout(err!.cause)).toBe(true);
      expect(err!.message).toContain('Falha em 004_eventos.sql');
      expect(err!.message).toContain('esperou 1 s');
      expect(err!.message).toContain('ROLLBACK');
      // Com acesso ao performance_schema (ex.: root), a mensagem aponta a conexão e o KILL pronto.
      if (err!.message.includes('Conexões que seguram')) {
        const [[{ id }]] = (await workbench.query('SELECT CONNECTION_ID() AS id')) as unknown as [[{ id: number }]];
        expect(err!.message).toContain(`KILL ${id};`);
        expect(err!.message).toContain('veiculo');
      }
    } finally {
      await workbench.rollback().catch(() => undefined);
      await workbench.end();
    }

    // Liberado o bloqueio, rodar de novo conclui (a 004 é reaplicável).
    await migrate(url, () => {}, 5);
    const [rows] = await pool.query<mysql.RowDataPacket[]>("SELECT nome FROM schema_migrations WHERE nome = '004_eventos.sql'");
    expect(rows).toHaveLength(1);
  });
});

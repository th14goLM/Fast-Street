/**
 * Espera por bloqueio (lock) no migrate e no seed.
 *
 * Por padrão o MySQL espera até 1 ano por um metadata lock: se uma aba do Workbench
 * (ou do IntelliJ) estiver com uma transação aberta, o migrate parece travado para sempre.
 * Aqui a espera passa a ter limite e, quando estoura, a mensagem diz quem está bloqueando.
 */
import type { Connection, RowDataPacket } from 'mysql2/promise';

/** Limita a espera por metadata locks (DDL) e por locks de linha (INSERT/DELETE) desta conexão. */
export async function applyLockTimeout(conn: Connection, seconds: number): Promise<void> {
  await conn.query('SET SESSION lock_wait_timeout = ?, SESSION innodb_lock_wait_timeout = ?', [seconds, seconds]);
}

/** ER_LOCK_WAIT_TIMEOUT (1205): vale para metadata lock e para lock de linha. */
export function isLockTimeout(err: unknown): boolean {
  const e = err as { code?: string; errno?: number } | null;
  return e?.code === 'ER_LOCK_WAIT_TIMEOUT' || e?.errno === 1205;
}

interface Sessao {
  id: number;
  origem: string;
  estado: string;
  tabelas: string[];
  transacaoDesde: Date | null;
}

/**
 * Sessões (fora esta) que seguram tabelas do banco ou têm transação aberta.
 * Usa o performance_schema direto, porque o schema `sys` nem sempre vem instalado.
 */
async function sessoesBloqueando(conn: Connection, schema: string): Promise<Sessao[]> {
  const [locks] = await conn.query<RowDataPacket[]>(
    `SELECT t.PROCESSLIST_ID AS id, t.PROCESSLIST_USER AS usuario, t.PROCESSLIST_HOST AS host,
            t.PROCESSLIST_COMMAND AS comando, t.PROCESSLIST_TIME AS segundos,
            GROUP_CONCAT(DISTINCT ml.OBJECT_NAME ORDER BY ml.OBJECT_NAME) AS tabelas
       FROM performance_schema.metadata_locks ml
       JOIN performance_schema.threads t ON t.THREAD_ID = ml.OWNER_THREAD_ID
      WHERE ml.OBJECT_SCHEMA = ? AND ml.OBJECT_TYPE = 'TABLE' AND ml.LOCK_STATUS = 'GRANTED'
        AND t.PROCESSLIST_ID IS NOT NULL AND t.PROCESSLIST_ID <> CONNECTION_ID()
      GROUP BY t.PROCESSLIST_ID, t.PROCESSLIST_USER, t.PROCESSLIST_HOST, t.PROCESSLIST_COMMAND, t.PROCESSLIST_TIME`,
    [schema],
  );
  const [trx] = await conn.query<RowDataPacket[]>(
    `SELECT x.trx_mysql_thread_id AS id, x.trx_started AS desde, p.USER AS usuario, p.HOST AS host,
            p.COMMAND AS comando, p.TIME AS segundos
       FROM information_schema.innodb_trx x
       LEFT JOIN information_schema.processlist p ON p.ID = x.trx_mysql_thread_id
      WHERE x.trx_mysql_thread_id <> CONNECTION_ID()`,
  );

  const porId = new Map<number, Sessao>();
  const sessao = (r: RowDataPacket): Sessao => {
    const id = Number(r.id);
    let s = porId.get(id);
    if (!s) {
      s = { id, origem: `${r.usuario ?? '?'}@${r.host ?? '?'}`, estado: `${r.comando ?? '?'} há ${r.segundos ?? '?'} s`, tabelas: [], transacaoDesde: null };
      porId.set(id, s);
    }
    return s;
  };
  for (const r of locks) sessao(r).tabelas = String(r.tabelas ?? '').split(',').filter(Boolean);
  for (const r of trx) sessao(r).transacaoDesde = r.desde ? new Date(r.desde) : null;
  return [...porId.values()].sort((a, b) => a.id - b.id);
}

/**
 * Mensagem para o terminal quando a espera estoura: o que aconteceu, quem segura o banco
 * e como liberar. Se não der para consultar o performance_schema, explica sem a lista.
 */
export async function explainLockTimeout(conn: Connection, schema: string, seconds: number): Promise<string> {
  const linhas = [
    `O MySQL esperou ${seconds} s por um bloqueio (lock) e desistiu.`,
    `Outra conexão está segurando tabelas do banco "${schema}". O mais comum é uma aba do MySQL Workbench`,
    'ou do IntelliJ com uma transação aberta (auto-commit desligado).',
  ];
  let sessoes: Sessao[] | null = null;
  try {
    sessoes = await sessoesBloqueando(conn, schema);
  } catch {
    /* sem acesso ao performance_schema: segue com a orientação genérica */
  }

  if (sessoes?.length) {
    linhas.push('', 'Conexões que seguram o banco agora:');
    for (const s of sessoes) {
      const detalhes = [
        s.tabelas.length ? `tabelas: ${s.tabelas.join(', ')}` : null,
        s.transacaoDesde ? `transação aberta desde ${s.transacaoDesde.toLocaleTimeString('pt-BR')}` : null,
      ].filter(Boolean);
      linhas.push(`  • id ${s.id} (${s.origem}, ${s.estado})${detalhes.length ? ` → ${detalhes.join('; ')}` : ''}`);
    }
  } else if (sessoes) {
    linhas.push('', 'Nenhuma conexão segura o banco agora: o bloqueio já foi liberado. Rode o comando de novo.');
    return linhas.join('\n');
  } else {
    linhas.push('', '(Não deu para listar as conexões: o usuário do DATABASE_URL não tem a permissão PROCESS. Use o root no Workbench.)');
  }

  const ids = sessoes?.map((s) => s.id) ?? [];
  linhas.push(
    '',
    'Como liberar:',
    '  1. Na aba do Workbench, rode COMMIT; ou ROLLBACK; e ative Query → Auto-Commit Transactions.',
    ids.length
      ? `  2. Ou encerre a conexão numa sessão do MySQL: ${ids.map((id) => `KILL ${id};`).join(' ')}`
      : '  2. Ou descubra a conexão com SHOW PROCESSLIST; e encerre-a com KILL <id>;',
    'Depois rode o comando de novo. Para mudar o tempo de espera, ajuste DB_LOCK_WAIT_TIMEOUT no api/.env.',
  );
  return linhas.join('\n');
}

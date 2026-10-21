import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type { Perfil } from './auth.schemas.js';

type Db = Pool | PoolConnection;

export interface UsuarioRow {
  id: string;
  email: string;
  senha_hash: string | null;
  nome_completo: string;
  perfil: Perfil;
  status: 'ativo' | 'exclusao_agendada' | 'anonimizado';
  email_verificado_em: Date | null;
  cidade_id: number;
  cidade_nome: string;
  cidade_uf: string;
  org_nome: string | null;
  org_verificado: number | null;
}

const USUARIO_SELECT = `
  SELECT u.id, u.email, u.senha_hash, u.nome_completo, u.perfil, u.status, u.email_verificado_em,
         c.id AS cidade_id, c.nome AS cidade_nome, c.uf AS cidade_uf,
         o.nome_organizacao AS org_nome, o.verificado AS org_verificado
    FROM usuario u
    JOIN cidade c ON c.id = u.cidade_id
    LEFT JOIN organizador o ON o.usuario_id = u.id`;

export async function findUsuarioByEmail(db: Db, email: string): Promise<UsuarioRow | null> {
  const [rows] = await db.query<(UsuarioRow & RowDataPacket)[]>(`${USUARIO_SELECT} WHERE u.email = ?`, [email]);
  return rows[0] ?? null;
}

export async function findUsuarioById(db: Db, id: string): Promise<UsuarioRow | null> {
  const [rows] = await db.query<(UsuarioRow & RowDataPacket)[]>(`${USUARIO_SELECT} WHERE u.id = ?`, [id]);
  return rows[0] ?? null;
}

export async function cidadeAtivaExiste(db: Db, id: number): Promise<boolean> {
  const [rows] = await db.query<RowDataPacket[]>('SELECT 1 FROM cidade WHERE id = ? AND ativa = 1', [id]);
  return rows.length > 0;
}

export async function insertUsuario(
  db: Db,
  u: { id: string; email: string; senhaHash: string; nomeCompleto: string; cidadeId: number; perfil: Perfil; termosVersao: string },
): Promise<void> {
  await db.query(
    `INSERT INTO usuario (id, email, senha_hash, nome_completo, cidade_id, perfil, termos_versao, termos_aceitos_em)
     VALUES (?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3))`,
    [u.id, u.email, u.senhaHash, u.nomeCompleto, u.cidadeId, u.perfil, u.termosVersao],
  );
}

export async function insertOrganizador(
  db: Db,
  o: { id: string; usuarioId: string; nome: string; tipoDocumento: 'cpf' | 'cnpj'; documento: string; telefone: string },
): Promise<void> {
  await db.query(
    `INSERT INTO organizador (id, usuario_id, nome_organizacao, tipo_documento, documento, telefone)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [o.id, o.usuarioId, o.nome, o.tipoDocumento, o.documento, o.telefone],
  );
}

// ── Tokens de verificação ────────────────────────────────────────────────────

export async function insertToken(
  db: Db,
  t: { id: string; usuarioId: string; tipo: 'verificacao_email' | 'redefinicao_senha'; hash: string; ttlMinutes: number },
): Promise<void> {
  await db.query(
    `INSERT INTO token_autenticacao (id, usuario_id, tipo, token_hash, expira_em)
     VALUES (?, ?, ?, ?, UTC_TIMESTAMP(3) + INTERVAL ? MINUTE)`,
    [t.id, t.usuarioId, t.tipo, t.hash, t.ttlMinutes],
  );
}

/** Segundos desde o último token do tipo emitido para o usuário (null se nunca). */
export async function secondsSinceLastToken(db: Db, usuarioId: string, tipo: string): Promise<number | null> {
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT TIMESTAMPDIFF(SECOND, MAX(created_at), UTC_TIMESTAMP(3)) AS s
       FROM token_autenticacao WHERE usuario_id = ? AND tipo = ?`,
    [usuarioId, tipo],
  );
  const s = rows[0]?.s;
  return s === null || s === undefined ? null : Number(s);
}

/** Consome um token válido (não usado, não expirado) e devolve o usuário dono. */
export async function consumeToken(db: Db, hash: string, tipo: string): Promise<string | null> {
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT id, usuario_id FROM token_autenticacao
      WHERE token_hash = ? AND tipo = ? AND usado_em IS NULL AND expira_em > UTC_TIMESTAMP(3)
      FOR UPDATE`,
    [hash, tipo],
  );
  const row = rows[0];
  if (!row) return null;
  await db.query('UPDATE token_autenticacao SET usado_em = UTC_TIMESTAMP(3) WHERE id = ?', [row.id]);
  return row.usuario_id as string;
}

export async function markEmailVerified(db: Db, usuarioId: string): Promise<void> {
  await db.query(
    'UPDATE usuario SET email_verificado_em = COALESCE(email_verificado_em, UTC_TIMESTAMP(3)) WHERE id = ?',
    [usuarioId],
  );
}

// ── Sessões ──────────────────────────────────────────────────────────────────

export async function insertSessao(
  db: Db,
  s: { id: string; usuarioId: string; refreshHash: string; dispositivo?: string; ttlDays: number },
): Promise<void> {
  await db.query(
    `INSERT INTO sessao (id, usuario_id, refresh_token_hash, dispositivo, expira_em)
     VALUES (?, ?, ?, ?, UTC_TIMESTAMP(3) + INTERVAL ? DAY)`,
    [s.id, s.usuarioId, s.refreshHash, s.dispositivo ?? null, s.ttlDays],
  );
}

export async function findSessaoAtiva(db: Db, refreshHash: string): Promise<{ id: string; usuario_id: string } | null> {
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT id, usuario_id FROM sessao
      WHERE refresh_token_hash = ? AND revogada_em IS NULL AND expira_em > UTC_TIMESTAMP(3)
      FOR UPDATE`,
    [refreshHash],
  );
  return (rows[0] as { id: string; usuario_id: string } | undefined) ?? null;
}

export async function rotateSessao(db: Db, id: string, newHash: string, ttlDays: number): Promise<void> {
  await db.query(
    `UPDATE sessao SET refresh_token_hash = ?, ultimo_uso_em = UTC_TIMESTAMP(3),
            expira_em = UTC_TIMESTAMP(3) + INTERVAL ? DAY WHERE id = ?`,
    [newHash, ttlDays, id],
  );
}

export async function revokeSessaoByHash(db: Db, refreshHash: string): Promise<boolean> {
  const [res] = await db.query<ResultSetHeader>(
    'UPDATE sessao SET revogada_em = UTC_TIMESTAMP(3) WHERE refresh_token_hash = ? AND revogada_em IS NULL',
    [refreshHash],
  );
  return res.affectedRows > 0;
}

import { randomUUID } from 'node:crypto';
import { env } from '../../config/env.js';
import { pool, withTransaction } from '../../db/pool.js';
import { AppError, Errors } from '../../shared/errors.js';
import type { Mailer } from '../../shared/mailer.js';
import { documentoTipo } from '../../shared/validators/documento.js';
import * as repo from './auth.repository.js';
import type { LoginInput, RegisterInput } from './auth.schemas.js';
import { DUMMY_HASH, hashPassword, newOpaqueToken, sha256, verifyPassword } from './crypto.js';
import { ACCESS_TOKEN_TTL_SECONDS, signAccessToken } from './jwt.js';

export const TERMOS_VERSAO = '2026-10';
export const RESEND_COOLDOWN_SECONDS = 60; // RN-CAD-07
const VERIFICATION_TTL_MINUTES = 24 * 60; // [I] a spec não define; 24 h é o usual
const REFRESH_TTL_DAYS = 30;

export interface UsuarioDTO {
  id: string;
  email: string;
  nomeCompleto: string;
  perfil: repo.UsuarioRow['perfil'];
  emailVerificado: boolean;
  cidade: { id: number; nome: string; uf: string };
  organizador: { nomeOrganizacao: string; verificado: boolean } | null;
}

export interface SessionTokens {
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
}

export const toDTO = (u: repo.UsuarioRow): UsuarioDTO => ({
  id: u.id,
  email: u.email,
  nomeCompleto: u.nome_completo,
  perfil: u.perfil,
  emailVerificado: u.email_verificado_em !== null,
  cidade: { id: u.cidade_id, nome: u.cidade_nome, uf: u.cidade_uf },
  organizador: u.org_nome ? { nomeOrganizacao: u.org_nome, verificado: u.org_verificado === 1 } : null,
});

const isDuplicateEntry = (err: unknown): boolean =>
  typeof err === 'object' && err !== null && (err as { code?: string }).code === 'ER_DUP_ENTRY';

export class AuthService {
  constructor(private readonly mailer: Mailer) {}

  /** UC-00: cria a conta, envia o e-mail de verificação e já abre uma sessão para o onboarding (passos 2–4). */
  async register(input: RegisterInput, dispositivo?: string): Promise<{ usuario: UsuarioDTO; tokens: SessionTokens }> {
    if (!(await repo.cidadeAtivaExiste(pool, input.cidadeId))) {
      throw new AppError(422, 'VALIDATION_ERROR', 'Revise 1 campo destacado.', { cidadeId: 'Selecione sua cidade.' });
    }
    if (await repo.findUsuarioByEmail(pool, input.email)) throw Errors.emailTaken();

    const senhaHash = await hashPassword(input.senha);
    const usuarioId = randomUUID();
    const verification = newOpaqueToken();

    try {
      await withTransaction(async (tx) => {
        await repo.insertUsuario(tx, {
          id: usuarioId,
          email: input.email,
          senhaHash,
          nomeCompleto: input.nomeCompleto,
          cidadeId: input.cidadeId,
          perfil: input.perfil,
          termosVersao: TERMOS_VERSAO,
        });
        if (input.perfil !== 'piloto' && input.organizacao) {
          // Já validado no schema; aqui só resolvemos o tipo.
          const tipo = documentoTipo(input.organizacao.documento)!;
          await repo.insertOrganizador(tx, {
            id: randomUUID(),
            usuarioId,
            nome: input.organizacao.nome,
            tipoDocumento: tipo,
            documento: input.organizacao.documento,
            telefone: input.organizacao.telefone,
          });
        }
        await repo.insertToken(tx, {
          id: randomUUID(),
          usuarioId,
          tipo: 'verificacao_email',
          hash: verification.hash,
          ttlMinutes: VERIFICATION_TTL_MINUTES,
        });
      });
    } catch (err) {
      // Corrida entre duas requisições com o mesmo e-mail.
      if (isDuplicateEntry(err)) throw Errors.emailTaken();
      throw err;
    }

    await this.sendVerificationEmail(input.email, input.nomeCompleto, verification.token);
    const usuario = (await repo.findUsuarioById(pool, usuarioId))!;
    const tokens = await this.openSession(usuarioId, dispositivo);
    return { usuario: toDTO(usuario), tokens };
  }

  /** UC-10: erro genérico para e-mail/senha; "não verificada" só após senha correta. */
  async login(input: LoginInput): Promise<{ usuario: UsuarioDTO; tokens: SessionTokens }> {
    const usuario = await repo.findUsuarioByEmail(pool, input.email);
    const ok = await verifyPassword(input.senha, usuario?.senha_hash ?? DUMMY_HASH);
    if (!usuario || !usuario.senha_hash || !ok || usuario.status !== 'ativo') throw Errors.invalidCredentials();
    if (!usuario.email_verificado_em) throw Errors.emailNotVerified(usuario.email);

    const tokens = await this.openSession(usuario.id, input.dispositivo);
    return { usuario: toDTO(usuario), tokens };
  }

  /**
   * Reenvio do e-mail de verificação. Resposta sempre idêntica (não revela se o
   * e-mail existe); o cooldown de 60 s é aplicado silenciosamente.
   */
  async resendVerification(email: string): Promise<{ retryAfterSeconds: number }> {
    const usuario = await repo.findUsuarioByEmail(pool, email);
    if (usuario && !usuario.email_verificado_em && usuario.status === 'ativo') {
      const since = await repo.secondsSinceLastToken(pool, usuario.id, 'verificacao_email');
      if (since === null || since >= RESEND_COOLDOWN_SECONDS) {
        const verification = newOpaqueToken();
        await repo.insertToken(pool, {
          id: randomUUID(),
          usuarioId: usuario.id,
          tipo: 'verificacao_email',
          hash: verification.hash,
          ttlMinutes: VERIFICATION_TTL_MINUTES,
        });
        await this.sendVerificationEmail(usuario.email, usuario.nome_completo, verification.token);
      }
    }
    return { retryAfterSeconds: RESEND_COOLDOWN_SECONDS };
  }

  async verifyEmail(token: string): Promise<boolean> {
    return withTransaction(async (tx) => {
      const usuarioId = await repo.consumeToken(tx, sha256(token), 'verificacao_email');
      if (!usuarioId) return false;
      await repo.markEmailVerified(tx, usuarioId);
      return true;
    });
  }

  /** Rotação de refresh token: o anterior deixa de valer imediatamente. */
  async refresh(refreshToken: string): Promise<SessionTokens> {
    return withTransaction(async (tx) => {
      const sessao = await repo.findSessaoAtiva(tx, sha256(refreshToken));
      if (!sessao) throw Errors.unauthorized();
      const next = newOpaqueToken();
      await repo.rotateSessao(tx, sessao.id, next.hash, REFRESH_TTL_DAYS);
      return {
        accessToken: signAccessToken({ sub: sessao.usuario_id, sid: sessao.id }),
        accessTokenExpiresIn: ACCESS_TOKEN_TTL_SECONDS,
        refreshToken: next.token,
      };
    });
  }

  async logout(refreshToken: string): Promise<void> {
    await repo.revokeSessaoByHash(pool, sha256(refreshToken));
  }

  async me(usuarioId: string): Promise<UsuarioDTO> {
    const usuario = await repo.findUsuarioById(pool, usuarioId);
    if (!usuario || usuario.status !== 'ativo') throw Errors.unauthorized();
    return toDTO(usuario);
  }

  private async openSession(usuarioId: string, dispositivo?: string): Promise<SessionTokens> {
    const sessaoId = randomUUID();
    const refresh = newOpaqueToken();
    await repo.insertSessao(pool, { id: sessaoId, usuarioId, refreshHash: refresh.hash, dispositivo, ttlDays: REFRESH_TTL_DAYS });
    return {
      accessToken: signAccessToken({ sub: usuarioId, sid: sessaoId }),
      accessTokenExpiresIn: ACCESS_TOKEN_TTL_SECONDS,
      refreshToken: refresh.token,
    };
  }

  private async sendVerificationEmail(email: string, nome: string, token: string): Promise<void> {
    const link = `${env.PUBLIC_API_URL}/auth/verify-email?token=${encodeURIComponent(token)}`;
    await this.mailer.send({
      to: email,
      subject: 'Confirme seu e-mail · Fast Street',
      text: `Olá, ${nome.split(' ')[0]}!\nConfirme seu e-mail para entrar no Fast Street:\n${link}\nO link vale por 24 horas.`,
    });
  }
}

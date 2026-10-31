import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { pool } from '../src/db/pool.js';
import { migrate } from '../src/db/migrate.js';
import type { MailMessage, Mailer } from '../src/shared/mailer.js';
import { resetDb } from './helpers.js';

class FakeMailer implements Mailer {
  readonly description = 'fake';
  sent: MailMessage[] = [];
  async send(m: MailMessage) {
    this.sent.push(m);
  }
  lastToken(): string {
    const text = this.sent.at(-1)?.text ?? '';
    const m = text.match(/token=([^\s]+)/);
    if (!m?.[1]) throw new Error('nenhum link de verificação enviado');
    return decodeURIComponent(m[1]);
  }
}

const mailer = new FakeMailer();
const app = createApp({ mailer });
let cascavelId: number;

const piloto = () => ({
  email: 'Lucas.Andrade@Gmail.com ',
  senha: 'Pista2026!',
  perfil: 'piloto',
  nomeCompleto: 'Lucas Andrade',
  cidadeId: cascavelId,
  termosAceitos: true,
});

beforeAll(async () => {
  await migrate(process.env.DATABASE_URL, () => {});
  const [rows] = await pool.query<any[]>("SELECT id FROM cidade WHERE nome = 'Cascavel'");
  cascavelId = rows[0].id;
});

beforeEach(async () => {
  mailer.sent = [];
  await resetDb();
});

afterAll(async () => {
  await pool.end();
});

describe('GET /cidades', () => {
  it('lista as cidades ativas do MVP em ordem alfabética', async () => {
    const res = await request(app).get('/cidades').expect(200);
    const nomes = res.body.cidades.map((c: { nome: string }) => c.nome);
    expect(nomes).toContain('Cascavel');
    expect(nomes).toEqual([...nomes].sort((a: string, b: string) => a.localeCompare(b)));
  });
});

describe('POST /auth/register (UC-00)', () => {
  it('cria piloto, normaliza o e-mail, envia verificação e abre sessão', async () => {
    const res = await request(app).post('/auth/register').send(piloto()).expect(201);
    expect(res.body.usuario).toMatchObject({
      email: 'lucas.andrade@gmail.com',
      perfil: 'piloto',
      emailVerificado: false,
      organizador: null,
      cidade: { nome: 'Cascavel', uf: 'PR' },
    });
    expect(res.body.tokens.accessToken).toBeTypeOf('string');
    expect(res.body.tokens.refreshToken).toBeTypeOf('string');
    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0]!.to).toBe('lucas.andrade@gmail.com');

    const [rows] = await pool.query<any[]>('SELECT senha_hash FROM usuario');
    expect(rows[0].senha_hash).toMatch(/^\$2[aby]\$12\$/); // nunca em texto puro
  });

  it('retorna 409 EMAIL_TAKEN para e-mail já cadastrado (sem diferenciar maiúsculas)', async () => {
    await request(app).post('/auth/register').send(piloto()).expect(201);
    const res = await request(app)
      .post('/auth/register')
      .send({ ...piloto(), email: 'LUCAS.ANDRADE@gmail.com' })
      .expect(409);
    expect(res.body.error).toMatchObject({ code: 'EMAIL_TAKEN', fields: { email: 'E-mail já cadastrado.' } });
  });

  it('valida campos com as mensagens do protótipo', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'lucas@', senha: '1234', perfil: 'ambos', nomeCompleto: ' ', organizacao: { documento: '1234' } })
      .expect(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.fields).toMatchObject({
      email: 'Informe um e-mail válido.',
      senha: 'A senha precisa ter ao menos 8 caracteres.',
      nomeCompleto: 'Campo obrigatório.',
      cidadeId: 'Selecione sua cidade.',
      termosAceitos: 'Aceite obrigatório para criar a conta.',
    });
    expect(res.body.error.message).toMatch(/^Revise \d+ campos destacados\.$/);
  });

  it('exige dados de verificação válidos para Organizador', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ ...piloto(), perfil: 'org', organizacao: { nome: '', documento: '52998224724', telefone: '4599' } })
      .expect(422);
    expect(res.body.error.fields).toEqual({
      'organizacao.nome': 'Campo obrigatório.',
      'organizacao.documento': 'CPF (11 dígitos) ou CNPJ (14 dígitos) inválido.',
      'organizacao.telefone': 'Telefone inválido.',
    });
  });

  it('cria organizador com CNPJ e telefone mascarados', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({
        ...piloto(),
        perfil: 'ambos',
        organizacao: { nome: 'Oeste Track Club', documento: '11.222.333/0001-81', telefone: '(45) 99999-0000' },
      })
      .expect(201);
    expect(res.body.usuario.organizador).toEqual({ nomeOrganizacao: 'Oeste Track Club', verificado: false });
    const [rows] = await pool.query<any[]>('SELECT tipo_documento, documento, telefone FROM organizador');
    expect(rows[0]).toEqual({ tipo_documento: 'cnpj', documento: '11222333000181', telefone: '45999990000' });
  });

  it('rejeita cidade inexistente', async () => {
    const res = await request(app).post('/auth/register').send({ ...piloto(), cidadeId: 999999 }).expect(422);
    expect(res.body.error.fields).toEqual({ cidadeId: 'Selecione sua cidade.' });
  });
});

describe('POST /auth/login (UC-10)', () => {
  it('erro genérico para e-mail inexistente e senha errada', async () => {
    await request(app).post('/auth/register').send(piloto()).expect(201);
    const a = await request(app).post('/auth/login').send({ email: 'ninguem@x.com', senha: 'Pista2026!' }).expect(401);
    const b = await request(app).post('/auth/login').send({ email: 'lucas.andrade@gmail.com', senha: 'errada123' }).expect(401);
    expect(a.body.error).toEqual({ code: 'INVALID_CREDENTIALS', message: 'E-mail ou senha incorretos' });
    expect(b.body.error).toEqual(a.body.error);
  });

  it('conta não verificada só é revelada com a senha correta; após verificar, entra', async () => {
    await request(app).post('/auth/register').send(piloto()).expect(201);
    const blocked = await request(app)
      .post('/auth/login')
      .send({ email: 'lucas.andrade@gmail.com', senha: 'Pista2026!' })
      .expect(403);
    expect(blocked.body.error).toMatchObject({ code: 'EMAIL_NOT_VERIFIED', email: 'lucas.andrade@gmail.com' });

    const page = await request(app).get('/auth/verify-email').query({ token: mailer.lastToken() }).expect(200);
    expect(page.text).toContain('E-mail confirmado');
    // Link de uso único.
    await request(app).get('/auth/verify-email').query({ token: mailer.lastToken() }).expect(400);

    const ok = await request(app).post('/auth/login').send({ email: 'lucas.andrade@gmail.com', senha: 'Pista2026!' }).expect(200);
    expect(ok.body.usuario.emailVerificado).toBe(true);

    const me = await request(app).get('/auth/me').set('Authorization', `Bearer ${ok.body.tokens.accessToken}`).expect(200);
    expect(me.body.usuario.nomeCompleto).toBe('Lucas Andrade');
  });
});

describe('reenvio de verificação', () => {
  it('responde igual para e-mail inexistente e aplica cooldown de 60 s', async () => {
    await request(app).post('/auth/register').send(piloto()).expect(201);
    expect(mailer.sent).toHaveLength(1);

    const r1 = await request(app).post('/auth/verify-email/resend').send({ email: 'lucas.andrade@gmail.com' }).expect(202);
    const r2 = await request(app).post('/auth/verify-email/resend').send({ email: 'nao.existe@gmail.com' }).expect(202);
    expect(r1.body).toEqual({ retryAfterSeconds: 60 });
    expect(r2.body).toEqual(r1.body);
    // Dentro do cooldown: nenhum e-mail novo além do cadastro.
    expect(mailer.sent).toHaveLength(1);

    await pool.query('UPDATE token_autenticacao SET created_at = created_at - INTERVAL 61 SECOND');
    await request(app).post('/auth/verify-email/resend').send({ email: 'lucas.andrade@gmail.com' }).expect(202);
    expect(mailer.sent).toHaveLength(2);
  });
});

describe('sessão', () => {
  it('rotaciona o refresh token e revoga no logout', async () => {
    const reg = await request(app).post('/auth/register').send(piloto()).expect(201);
    const first = reg.body.tokens.refreshToken;

    const r = await request(app).post('/auth/refresh').send({ refreshToken: first }).expect(200);
    expect(r.body.refreshToken).not.toBe(first);
    await request(app).post('/auth/refresh').send({ refreshToken: first }).expect(401);

    await request(app).post('/auth/logout').send({ refreshToken: r.body.refreshToken }).expect(204);
    await request(app).post('/auth/refresh').send({ refreshToken: r.body.refreshToken }).expect(401);
  });

  it('rejeita /auth/me sem token', async () => {
    await request(app).get('/auth/me').expect(401);
  });
});
